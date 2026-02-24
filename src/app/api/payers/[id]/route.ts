import { NextResponse } from 'next/server';
import { mockPayers, mockOrders, mockFeeSchedules } from '@/lib/mockData';
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

        const payerIndex = mockPayers.findIndex(p => p.id === id);
        if (payerIndex === -1) {
            return NextResponse.json({ error: 'Payer not found' }, { status: 404 });
        }

        mockPayers[payerIndex].name = data.name.trim();

        return NextResponse.json(mockPayers[payerIndex]);
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
        const count = mockOrders.filter(o => o.payerId === id).length;
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete payer tied to existing orders' }, { status: 400 });
        }

        // Delete associated fee schedules first via transaction or cascade
        const fsIndexesToDelete = [];
        for (let i = 0; i < mockFeeSchedules.length; i++) {
            if (mockFeeSchedules[i].payerId === id) fsIndexesToDelete.push(i);
        }
        // Delete in reverse order to avoiding shifting issues
        for (let i = fsIndexesToDelete.length - 1; i >= 0; i--) {
            mockFeeSchedules.splice(fsIndexesToDelete[i], 1);
        }

        const payerIndex = mockPayers.findIndex(p => p.id === id);
        if (payerIndex > -1) {
            mockPayers.splice(payerIndex, 1);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
