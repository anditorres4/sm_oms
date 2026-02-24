import { NextResponse } from 'next/server';
import { mockFeeSchedules } from '@/lib/mockData';
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

        const feeIndex = mockFeeSchedules.findIndex(fs => fs.id === id);
        if (feeIndex === -1) {
            return NextResponse.json({ error: 'Fee schedule not found' }, { status: 404 });
        }

        const hcpcs = data.hcpcsCode.trim().toUpperCase();

        const exists = mockFeeSchedules.some(fs => fs.payerId === mockFeeSchedules[feeIndex].payerId && fs.hcpcsCode === hcpcs && fs.id !== id);
        if (exists) {
            return NextResponse.json({ error: 'Fee schedule for this HCPCS code already exists under this payer.' }, { status: 400 });
        }

        mockFeeSchedules[feeIndex].hcpcsCode = hcpcs;
        mockFeeSchedules[feeIndex].rate = parseFloat(data.rate) as any;

        return NextResponse.json(mockFeeSchedules[feeIndex]);
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

        const feeIndex = mockFeeSchedules.findIndex(fs => fs.id === id);
        if (feeIndex > -1) {
            mockFeeSchedules.splice(feeIndex, 1);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
