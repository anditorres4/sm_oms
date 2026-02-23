import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const patientName = searchParams.get('patientName');
    const orderId = searchParams.get('orderId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const orders = await prisma.order.findMany({
        where: {
            ...(status && status !== 'all' ? { status: status as OrderStatus } : {}),
            ...(orderId ? { id: { contains: orderId, mode: 'insensitive' } } : {}),
            ...(patientName
                ? {
                    patient: {
                        OR: [
                            { firstName: { contains: patientName, mode: 'insensitive' } },
                            { lastName: { contains: patientName, mode: 'insensitive' } },
                        ],
                    },
                }
                : {}),
            ...(dateFrom || dateTo
                ? {
                    createdAt: {
                        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
                    },
                }
                : {}),
        },
        include: {
            patient: true,
            clinician: true,
            createdBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            lines: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { patient, clinician } = body;

        // Create/find patient
        const patientRecord = await prisma.patient.create({
            data: {
                firstName: patient.firstName,
                lastName: patient.lastName,
                address: patient.address,
                phone: patient.phone,
                email: patient.email,
            },
        });

        // Create/find clinician
        const clinicianRecord = await prisma.clinician.create({
            data: {
                firstName: clinician.firstName,
                lastName: clinician.lastName,
                clinicName: clinician.clinicName,
                clinicAddress: clinician.clinicAddress,
                phone: clinician.phone,
                email: clinician.email,
            },
        });

        // Create draft order
        const order = await prisma.order.create({
            data: {
                patientId: patientRecord.id,
                clinicianId: clinicianRecord.id,
                createdById: session.user.id,
                assignedToId: session.user.id,
                isDraft: true,
                status: 'pending_approval',
            },
            include: {
                patient: true,
                clinician: true,
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });

        // Audit event
        await prisma.auditEvent.create({
            data: {
                orderId: order.id,
                actorUserId: session.user.id,
                eventType: 'ORDER_CREATED',
                eventPayload: { note: 'Order created as draft' },
            },
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
