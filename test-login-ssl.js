const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testLogin() {
  try {
    console.log('🔐 Testing TiDB SSL connection with user login...\n');

    // Test với admin@intersnack.com.vn (role ADMIN)
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@intersnack.com.vn' }
    });

    if (adminUser) {
      console.log('✅ Admin user found:');
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Name: ${adminUser.name}`);
      console.log(`   - Role: ${adminUser.role}`);
      console.log(`   - Status: ${adminUser.status}\n`);
    } else {
      console.log('❌ Admin user not found\n');
    }

    // Test với linemanager@intersnack.com.vn (role LINE_MANAGER)
    const lineManagerUser = await prisma.user.findUnique({
      where: { email: 'linemanager@intersnack.com.vn' }
    });

    if (lineManagerUser) {
      console.log('✅ Line Manager user found:');
      console.log(`   - Email: ${lineManagerUser.email}`);
      console.log(`   - Name: ${lineManagerUser.name}`);
      console.log(`   - Role: ${lineManagerUser.role}`);
      console.log(`   - Status: ${lineManagerUser.status}\n`);
    } else {
      console.log('❌ Line Manager user not found\n');
    }

    // Test với hod@intersnack.com.vn (role MANAGER)
    const managerUser = await prisma.user.findUnique({
      where: { email: 'hod@intersnack.com.vn' }
    });

    if (managerUser) {
      console.log('✅ Manager user found:');
      console.log(`   - Email: ${managerUser.email}`);
      console.log(`   - Name: ${managerUser.name}`);
      console.log(`   - Role: ${managerUser.role}`);
      console.log(`   - Status: ${managerUser.status}\n`);
    } else {
      console.log('❌ Manager user not found\n');
    }

    // Test với staff (ngan.ngo@intersnack.com.vn)
    const staffUser = await prisma.user.findUnique({
      where: { email: 'ngan.ngo@intersnack.com.vn' }
    });

    if (staffUser) {
      console.log('✅ Staff user found:');
      console.log(`   - Email: ${staffUser.email}`);
      console.log(`   - Name: ${staffUser.name}`);
      console.log(`   - Role: ${staffUser.role}`);
      console.log(`   - Status: ${staffUser.status}\n`);
    } else {
      console.log('❌ Staff user not found\n');
    }

    console.log('✅ SSL connection test successful! All queries executed without SSL errors.\n');

  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
