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

        if (!data.hcpcsCode || data.rate === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const fee = await prisma.feeSchedule.update({
            where: { id },
            data: {
                hcpcsCode: data.hcpcsCode.trim().toUpperCase(),
                rate: parseFloat(data.rate)
            }
        });

        return NextResponse.json(fee);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Fee schedule for this HCPCS code already exists under this payer.' }, { status: 400 });
        }
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

        await prisma.feeSchedule.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
