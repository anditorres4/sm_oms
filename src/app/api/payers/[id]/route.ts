import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();
        const { id } = await params;

        if (!data.name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const payer = await prisma.payer.update({
            where: { id },
            data: { name: data.name.trim() }
        });

        return NextResponse.json(payer);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        const { id } = await params;

        // Check for orders
        const count = await prisma.order.count({ where: { payerId: id } });
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete payer tied to existing orders' }, { status: 400 });
        }

        // Delete associated fee schedules first via transaction or cascade
        await prisma.$transaction([
            prisma.feeSchedule.deleteMany({ where: { payerId: id } }),
            prisma.payer.delete({ where: { id } })
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
