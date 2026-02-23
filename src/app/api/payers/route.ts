import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payers = await prisma.payer.findMany({
        include: { feeSchedule: true },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(payers);
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();

        if (!data.name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const payer = await prisma.payer.create({
            data: { name: data.name.trim() }
        });

        return NextResponse.json(payer, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
