import { NextRequest, NextResponse } from 'next/server';
import { mockPayers, mockFeeSchedules } from '@/lib/mockData';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payersWithFees = [...mockPayers].map(p => ({
        ...p,
        feeSchedule: mockFeeSchedules.filter(fs => fs.payerId === p.id)
    })).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(payersWithFees);
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

        const payer = {
            id: `payer-${Date.now()}`,
            name: data.name.trim()
        };

        mockPayers.push(payer);

        return NextResponse.json(payer, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
