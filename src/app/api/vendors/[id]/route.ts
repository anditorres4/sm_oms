import { NextResponse } from 'next/server';
import { mockVendors, mockProducts } from '@/lib/mockData';
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

        const vendorIndex = mockVendors.findIndex(v => v.id === id);
        if (vendorIndex === -1) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }

        mockVendors[vendorIndex].name = data.name.trim();

        return NextResponse.json(mockVendors[vendorIndex]);
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

        // Check if products exist for this vendor
        const count = mockProducts.filter(p => p.vendorId === id).length;
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete vendor with associated products' }, { status: 400 });
        }

        const vendorIndex = mockVendors.findIndex(v => v.id === id);
        if (vendorIndex > -1) {
            mockVendors.splice(vendorIndex, 1);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
