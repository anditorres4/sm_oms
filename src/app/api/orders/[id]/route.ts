import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PayerType } from '@prisma/client';

export async function GET(
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
            createdBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            lines: {
                include: {
                    product: { include: { vendor: true } },
                },
            },
            documents: { orderBy: { createdAt: 'desc' } },
            auditEvents: {
                include: { actor: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json(order);
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    try {
        const existingOrder = await prisma.order.findUnique({ where: { id } });
        if (!existingOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (!existingOrder.isDraft) {
            // Submitted orders only allow status changes
            return NextResponse.json({ error: 'Order is submitted and cannot be edited' }, { status: 400 });
        }

        const { patient, clinician, lines, payerType, payerId, insuranceChecklist } = body;

        // Update patient
        if (patient && existingOrder.patientId) {
            await prisma.patient.update({
                where: { id: existingOrder.patientId },
                data: patient,
            });
        }

        // Update clinician
        if (clinician && existingOrder.clinicianId) {
            await prisma.clinician.update({
                where: { id: existingOrder.clinicianId },
                data: clinician,
            });
        }

        // Replace order lines if provided
        if (lines !== undefined) {
            await prisma.orderLine.deleteMany({ where: { orderId: id } });
            if (lines.length > 0) {
                await prisma.orderLine.createMany({
                    data: lines.map((l: any) => ({
                        orderId: id,
                        productId: l.productId,
                        quantity: l.quantity,
                        unitPrice: l.unitPrice,
                        lineTotal: l.lineTotal,
                        measurementFormUrl: l.measurementFormUrl || null,
                    })),
                });
            }
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                ...(payerType !== undefined ? { payerType: payerType as PayerType } : {}),
                ...(payerId !== undefined ? { payerId: payerId || null } : {}),
                ...(insuranceChecklist !== undefined ? { insuranceChecklist } : {}),
            },
            include: {
                patient: true,
                clinician: true,
                payer: true,
                lines: { include: { product: { include: { vendor: true } } } },
                documents: true,
            },
        });

        // Audit event
        await prisma.auditEvent.create({
            data: {
                orderId: id,
                actorUserId: session.user.id,
                eventType: 'ORDER_UPDATED',
                eventPayload: { fields: Object.keys(body) },
            },
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
