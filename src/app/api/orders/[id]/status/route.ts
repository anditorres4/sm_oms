import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    payment_confirmed: 'Payment Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
};

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json();

    if (!Object.keys(STATUS_LABELS).includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const previousStatus = order.status;

    const updated = await prisma.order.update({
        where: { id },
        data: { status: status as OrderStatus },
    });

    await prisma.auditEvent.create({
        data: {
            orderId: id,
            actorUserId: session.user.id,
            eventType: 'STATUS_CHANGED',
            eventPayload: {
                from: previousStatus,
                to: status,
                fromLabel: STATUS_LABELS[previousStatus],
                toLabel: STATUS_LABELS[status],
            },
        },
    });

    return NextResponse.json(updated);
}
