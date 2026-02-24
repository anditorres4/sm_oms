import { NextRequest, NextResponse } from 'next/server';
import { mockOrders, mockPatients, mockClinicians, mockPayers, mockOrderLines, mockDocuments, mockAuditEvents, mockProducts, mockVendors } from '@/lib/mockData';
import { auth } from '@/lib/auth';
import { generateEncounterFormPDF } from '@/lib/pdf/generateEncounterForm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const orderIndex = mockOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const orderObj = mockOrders[orderIndex];

    const lines = mockOrderLines.filter(l => l.orderId === id).map(l => ({
        ...l,
        product: { ...mockProducts.find(p => p.id === l.productId), vendor: mockVendors.find(v => v.id === mockProducts.find(p => p.id === l.productId)?.vendorId) }
    }));

    const order = {
        ...orderObj,
        patient: mockPatients.find(p => p.id === orderObj.patientId) || null,
        clinician: mockClinicians.find(c => c.id === orderObj.clinicianId) || null,
        payer: mockPayers.find(p => p.id === orderObj.payerId) || null,
        lines,
    };

    try {
        const pdfBytes = await generateEncounterFormPDF(order as any);
        const pdfDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
        await mkdir(pdfDir, { recursive: true });

        const existingDocsCount = mockDocuments.filter(d => d.orderId === id && d.type === 'ENCOUNTER').length;
        const version = existingDocsCount + 1;
        const fileName = `${id}-encounter-v${version}.pdf`;
        const filePath = path.join(pdfDir, fileName);
        await writeFile(filePath, pdfBytes);

        const fileUrl = `/uploads/pdfs/${fileName}`;
        const doc = {
            id: `doc-${Date.now()}`,
            orderId: id,
            type: 'ENCOUNTER',
            fileUrl,
            version,
            createdAt: new Date(),
        } as any;

        mockDocuments.push(doc);

        mockAuditEvents.push({
            id: `audit-${Date.now()}`,
            orderId: id,
            actorUserId: session.user.id,
            eventType: 'PDF_GENERATED',
            eventPayload: { documentId: doc.id, fileUrl } as any,
            createdAt: new Date(),
        });

        return NextResponse.json({ document: doc });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
