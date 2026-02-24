import { NextResponse } from 'next/server';
import { mockProducts, mockVendors, mockOrderLines } from '@/lib/mockData';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();
        const { id } = await params;

        if (!data.name || !data.hcpcsCode || !data.vendorId || !data.category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const productIndex = mockProducts.findIndex(p => p.id === id);
        if (productIndex === -1) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        mockProducts[productIndex] = {
            ...mockProducts[productIndex],
            name: data.name.trim(),
            hcpcsCode: data.hcpcsCode.trim(),
            vendorId: data.vendorId,
            unitCost: data.unitCost ? parseFloat(data.unitCost) : 0,
            msrp: data.msrp ? parseFloat(data.msrp) : 0,
            category: data.category.trim(),
            measurementFormRequired: Boolean(data.measurementFormRequired)
        } as any;

        const productWithVendor = {
            ...mockProducts[productIndex],
            vendor: mockVendors.find(v => v.id === mockProducts[productIndex].vendorId) || null
        };

        return NextResponse.json(productWithVendor);
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

        // Check if orders exist with this product
        const count = mockOrderLines.filter(line => line.productId === id).length;
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete product currently tied to orders' }, { status: 400 });
        }

        const productIndex = mockProducts.findIndex(p => p.id === id);
        if (productIndex > -1) {
            mockProducts.splice(productIndex, 1);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
