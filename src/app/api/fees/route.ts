import { NextResponse } from 'next/server';
import { mockFeeSchedules } from '@/lib/mockData';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();

        if (!data.payerId || !data.hcpcsCode || data.rate === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const hcpcs = data.hcpcsCode.trim().toUpperCase();

        const exists = mockFeeSchedules.some(fs => fs.payerId === data.payerId && fs.hcpcsCode === hcpcs);
        if (exists) {
            return NextResponse.json({ error: 'Fee schedule for this HCPCS code already exists under this payer.' }, { status: 400 });
        }

        const fee = {
            id: `fs-${Date.now()}`,
            payerId: data.payerId,
            hcpcsCode: hcpcs,
            rate: parseFloat(data.rate)
        } as any;

        mockFeeSchedules.push(fee);

        return NextResponse.json(fee, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
