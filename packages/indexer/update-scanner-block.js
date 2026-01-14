const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Update scanner to start from block 33400000 (just before recent deployment)
    await prisma.scannerState.upsert({
        where: { id: 1 },
        update: { lastBlockScanned: BigInt(33400000) },
        create: { id: 1, lastBlockScanned: BigInt(33400000) }
    });
    
    console.log('✅ Updated scanner to start from block 33400000');
    
    const state = await prisma.scannerState.findUnique({ where: { id: 1 } });
    console.log('Current state:', state);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
