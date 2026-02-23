import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const products = await prisma.product.findMany({
        where: q
            ? {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { hcpcsCode: { contains: q, mode: 'insensitive' } },
                    { category: { contains: q, mode: 'insensitive' } },
                ],
            }
            : undefined,
        include: { vendor: true },
        orderBy: { name: 'asc' },
        take: 50,
    });

    return NextResponse.json(products);
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

        const product = await prisma.product.create({
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

        return NextResponse.json(product, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
