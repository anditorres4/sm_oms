import { NextRequest, NextResponse } from 'next/server';
import { mockOrders, mockPatients, mockClinicians, mockPayers, mockOrderLines, mockDocuments, mockAuditEvents, mockProducts, mockVendors } from '@/lib/mockData';
import { auth } from '@/lib/auth';
import { generateEncounterFormPDF } from '@/lib/pdf/generateEncounterForm';
import { generatePatientInvoicePDF } from '@/lib/pdf/generateInvoice';
import { generateProofOfDeliveryPDF } from '@/lib/pdf/generatePOD';
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

    if (!order.isDraft) return NextResponse.json({ error: 'Order already submitted' }, { status: 400 });

    // Validate: must have at least 1 line
    if (order.lines.length === 0) {
        return NextResponse.json({ error: 'Order must have at least one product line' }, { status: 400 });
    }

    // Validate: insurance checklist must be complete if insurance
    const checklist = order.insuranceChecklist as Record<string, boolean> | null;
    if (order.payerType === 'insurance') {
        const requiredFields = [
            'activeCoverage', 'dmeBenefit', 'hcpcsCoveragePolicy',
            'priorAuthTriggers', 'deductibleCoinsurance',
            'documentationRequirements', 'payerGuidelinesChecked',
        ];
        const allChecked = requiredFields.every((f) => checklist?.[f] === true);
        if (!allChecked) {
            return NextResponse.json({ error: 'Insurance checklist must be fully completed' }, { status: 400 });
        }
    }

    try {
        // Determine auto-approval logic
        // If NO products in the order have an HCPCS code from the hardcoded list, automatically approve.
        const APPROVAL_REQUIRED_HCPCS_CODES = ['L0456', 'L0120'];
        const needsApproval = order.lines.some((line: any) => APPROVAL_REQUIRED_HCPCS_CODES.includes(line.product.hcpcsCode));
        const finalStatus = needsApproval ? 'pending_approval' : 'approved';

        // Generate PDFs
        const pdfDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
        await mkdir(pdfDir, { recursive: true });

        // Get next version based on existing Encounter docs
        const existingDocsCount = mockDocuments.filter(d => d.orderId === id && d.type === 'ENCOUNTER').length;
        const version = existingDocsCount + 1;

        // Run pdf generators in parallel
        const [encounterBytes, invoiceBytes, podBytes] = await Promise.all([
            generateEncounterFormPDF(order as any),
            generatePatientInvoicePDF(order as any),
            generateProofOfDeliveryPDF(order as any),
        ]);

        const encounterFileName = `${id}-encounter-v${version}.pdf`;
        const invoiceFileName = `${id}-invoice-v${version}.pdf`;
        const podFileName = `${id}-pod-v${version}.pdf`;

        await Promise.all([
            writeFile(path.join(pdfDir, encounterFileName), encounterBytes),
            writeFile(path.join(pdfDir, invoiceFileName), invoiceBytes),
            writeFile(path.join(pdfDir, podFileName), podBytes),
        ]);

        // Create document records
        const docs = [
            {
                id: `doc-${Date.now()}-1`,
                orderId: id,
                type: 'ENCOUNTER',
                fileUrl: `/uploads/pdfs/${encounterFileName}`,
                version,
                createdAt: new Date(),
            },
            {
                id: `doc-${Date.now()}-2`,
                orderId: id,
                type: 'INVOICE',
                fileUrl: `/uploads/pdfs/${invoiceFileName}`,
                version,
                createdAt: new Date(),
            },
            {
                id: `doc-${Date.now()}-3`,
                orderId: id,
                type: 'POD',
                fileUrl: `/uploads/pdfs/${podFileName}`,
                version,
                createdAt: new Date(),
            }
        ] as any[];

        mockDocuments.push(...docs);

        // Mark order as submitted and update status
        mockOrders[orderIndex].isDraft = false;
        mockOrders[orderIndex].submittedAt = new Date();
        mockOrders[orderIndex].status = finalStatus as any;

        // Audit events
        mockAuditEvents.push({
            id: `audit-${Date.now()}-1`,
            orderId: id,
            actorUserId: session.user.id,
            eventType: 'ORDER_SUBMITTED',
            eventPayload: {
                encounterDocId: docs[0].id,
                invoiceDocId: docs[1].id,
                podDocId: docs[2].id,
                autoApproved: !needsApproval
            } as any,
            createdAt: new Date(),
        });

        if (!needsApproval) {
            mockAuditEvents.push({
                id: `audit-${Date.now()}-2`,
                orderId: id,
                actorUserId: session.user.id,
                eventType: 'STATUS_CHANGED',
                eventPayload: {
                    from: 'draft',
                    to: 'approved',
                    note: 'Order auto-approved (no products require manager approval)'
                } as any,
                createdAt: new Date(),
            });
        }

        return NextResponse.json({ order: mockOrders[orderIndex], documents: docs });
    } catch (error) {
        console.error('Submit error:', error);
        return NextResponse.json({ error: 'Failed to submit order' }, { status: 500 });
    }
}
