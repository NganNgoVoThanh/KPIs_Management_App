const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking linemanager in TiDB ===\n');
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: 'linemanager@intersnack.com.vn' }
  });
  
  if (user) {
    console.log('✓ User found in TiDB:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role, user.role === 'LINE_MANAGER' ? '✅' : '❌ WRONG!');
    console.log('  ID:', user.id);
    
    if (user.role !== 'LINE_MANAGER') {
      console.log('\n🔧 FIXING: Updating role to LINE_MANAGER...');
      
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'LINE_MANAGER' }
      });
      
      console.log('✅ Role updated!');
      console.log('  New role:', updated.role);
    } else {
      console.log('\n✅ Role is already correct!');
    }
  } else {
    console.log('❌ User NOT found in TiDB');
    console.log('Will be auto-created on next login with correct role');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
