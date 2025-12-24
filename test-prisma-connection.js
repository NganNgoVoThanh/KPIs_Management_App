const { PrismaClient } = require('@prisma/client');

async function testPrismaConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('Testing Prisma connection to TiDB...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Prisma connected to database');

    // Count users
    const userCount = await prisma.user.count();
    console.log('Total users:', userCount);

    // Find specific user
    const user = await prisma.user.findUnique({
      where: { email: 'ngan.ngo@intersnack.com.vn' }
    });

    if (user) {
      console.log('\n✅ User found via Prisma:');
      console.log(user);
    } else {
      console.log('\n❌ User not found via Prisma');
    }

    await prisma.$disconnect();
    console.log('\n✅ Prisma disconnected');
  } catch (error) {
    console.error('❌ Prisma error:', error.message);
    console.error('\nFull error:', error);
    await prisma.$disconnect();
  }
}

testPrismaConnection();
