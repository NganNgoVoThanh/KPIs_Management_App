const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking linemanager user in TiDB ===\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'linemanager@intersnack.com.vn' }
  });
  
  if (user) {
    console.log('User found:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  ID:', user.id);
    
    if (user.role !== 'LINE_MANAGER') {
      console.log('\n❌ WRONG ROLE! Current:', user.role);
      console.log('Updating to LINE_MANAGER...');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'LINE_MANAGER' }
      });
      
      console.log('✅ Role updated successfully!');
    } else {
      console.log('\n✅ Role is correct (LINE_MANAGER)');
    }
  } else {
    console.log('❌ User not found in TiDB');
    console.log('Will be auto-created on next login with correct role');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
