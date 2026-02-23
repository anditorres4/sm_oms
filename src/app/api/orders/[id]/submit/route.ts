import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        const existingDocs = await prisma.document.count({ where: { orderId: id, type: 'ENCOUNTER' } });
        const version = existingDocs + 1;

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
        const docs = await prisma.$transaction([
            prisma.document.create({
                data: { orderId: id, type: 'ENCOUNTER', fileUrl: `/uploads/pdfs/${encounterFileName}`, version },
            }),
            prisma.document.create({
                data: { orderId: id, type: 'INVOICE', fileUrl: `/uploads/pdfs/${invoiceFileName}`, version },
            }),
            prisma.document.create({
                data: { orderId: id, type: 'POD', fileUrl: `/uploads/pdfs/${podFileName}`, version },
            }),
        ]);

        // Mark order as submitted and update status
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                isDraft: false,
                submittedAt: new Date(),
                status: finalStatus,
            },
        });

        // Audit events
        await prisma.auditEvent.create({
            data: {
                orderId: id,
                actorUserId: session.user.id,
                eventType: 'ORDER_SUBMITTED',
                eventPayload: {
                    encounterDocId: docs[0].id,
                    invoiceDocId: docs[1].id,
                    podDocId: docs[2].id,
                    autoApproved: !needsApproval
                },
            },
        });

        if (!needsApproval) {
            await prisma.auditEvent.create({
                data: {
                    orderId: id,
                    actorUserId: session.user.id,
                    eventType: 'STATUS_CHANGED',
                    eventPayload: {
                        from: 'draft',
                        to: 'approved',
                        note: 'Order auto-approved (no products require manager approval)'
                    },
                },
            });
        }

        return NextResponse.json({ order: updatedOrder, documents: docs });
    } catch (error) {
        console.error('Submit error:', error);
        return NextResponse.json({ error: 'Failed to submit order' }, { status: 500 });
    }
}
