import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@oms.com' }
    });
    if (!admin) {
        console.log('Admin not found in DB');
        return;
    }

    const isValid = await bcrypt.compare('password123', admin.passwordHash);
    console.log('Is valid?', isValid);
}

main().catch(console.error).finally(() => prisma.$disconnect());
