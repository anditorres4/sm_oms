import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const orderId = formData.get('orderId') as string;
        const lineId = formData.get('lineId') as string;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'measurement-forms');
        await mkdir(uploadDir, { recursive: true });

        const ext = file.name.split('.').pop();
        const fileName = `${orderId}-${lineId}-${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const url = `/uploads/measurement-forms/${fileName}`;
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
