import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            patient: true,
            clinician: true,
            payer: true,
            lines: { include: { product: { include: { vendor: true } } } },
        },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    try {
        const pdfBytes = await generateEncounterFormPDF(order as any);
        const pdfDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
        await mkdir(pdfDir, { recursive: true });

        const existingDocs = await prisma.document.count({ where: { orderId: id, type: 'ENCOUNTER' } });
        const version = existingDocs + 1;
        const fileName = `${id}-encounter-v${version}.pdf`;
        const filePath = path.join(pdfDir, fileName);
        await writeFile(filePath, pdfBytes);

        const fileUrl = `/uploads/pdfs/${fileName}`;
        const doc = await prisma.document.create({
            data: { orderId: id, type: 'ENCOUNTER', fileUrl, version },
        });

        await prisma.auditEvent.create({
            data: {
                orderId: id,
                actorUserId: session.user.id,
                eventType: 'PDF_GENERATED',
                eventPayload: { documentId: doc.id, fileUrl },
            },
        });

        return NextResponse.json({ document: doc });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
