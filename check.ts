import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@oms.com' }
    });
    console.log('ADMIN USER:', admin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
