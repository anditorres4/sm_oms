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

        if (!data.name || !data.hcpcsCode || !data.vendorId || !data.category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: data.name.trim(),
                hcpcsCode: data.hcpcsCode.trim(),
                vendorId: data.vendorId,
                unitCost: data.unitCost ? parseFloat(data.unitCost) : 0,
                msrp: data.msrp ? parseFloat(data.msrp) : 0,
                category: data.category.trim(),
                measurementFormRequired: Boolean(data.measurementFormRequired)
            },
            include: { vendor: true }
        });

        return NextResponse.json(product);
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
        const count = await prisma.orderLine.count({ where: { productId: id } });
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete product currently tied to orders' }, { status: 400 });
        }

        await prisma.product.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
