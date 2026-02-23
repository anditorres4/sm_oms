import { NextRequest, NextResponse } from 'next/server';
import { mockProducts, mockVendors } from '@/lib/mockData';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    let products = [...mockProducts];
    if (q) {
        const lowerQ = q.toLowerCase();
        products = products.filter(p =>
            p.name.toLowerCase().includes(lowerQ) ||
            p.hcpcsCode.toLowerCase().includes(lowerQ) ||
            p.category.toLowerCase().includes(lowerQ)
        );
    }

    products.sort((a, b) => a.name.localeCompare(b.name));

    // Attach vendor object
    const productsWithVendor = products.slice(0, 50).map(p => ({
        ...p,
        vendor: mockVendors.find(v => v.id === p.vendorId) || null
    }));

    return NextResponse.json(productsWithVendor);
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();

        if (!data.name || !data.hcpcsCode || !data.vendorId || !data.category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const product = {
            id: `prod-${Date.now()}`,
            name: data.name.trim(),
            hcpcsCode: data.hcpcsCode.trim(),
            vendorId: data.vendorId,
            unitCost: data.unitCost ? parseFloat(data.unitCost) : 0,
            msrp: data.msrp ? parseFloat(data.msrp) : 0,
            category: data.category.trim(),
            measurementFormRequired: Boolean(data.measurementFormRequired)
        } as any;

        mockProducts.push(product);

        const productWithVendor = {
            ...product,
            vendor: mockVendors.find(v => v.id === product.vendorId) || null
        };

        return NextResponse.json(productWithVendor, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
