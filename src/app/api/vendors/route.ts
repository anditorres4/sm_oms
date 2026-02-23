import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();
        // Allow ops & admin to fetch, maybe order_entry if needed
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const vendors = await prisma.vendor.findMany({
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(vendors);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();

        if (!data.name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const vendor = await prisma.vendor.create({
            data: { name: data.name.trim() }
        });

        return NextResponse.json(vendor, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
