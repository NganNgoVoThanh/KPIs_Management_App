const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

async function checkAllUsers() {
  try {
    console.log('🔍 Fetching all users from TiDB...\n');

    const users = await prisma.user.findMany({
      orderBy: {
        role: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database\n');
      return;
    }

    console.log(`✅ Found ${users.length} users:\n`);

    // Group by role
    const usersByRole = {
      ADMIN: [],
      LINE_MANAGER: [],
      MANAGER: [],
      STAFF: []
    };

    users.forEach(user => {
      if (usersByRole[user.role]) {
        usersByRole[user.role].push(user);
      }
    });

    // Display by role
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      if (roleUsers.length > 0) {
        console.log(`\n📋 ${role} (${roleUsers.length} users):`);
        console.log('─'.repeat(80));
        roleUsers.forEach(user => {
          console.log(`  • ${user.email.padEnd(40)} → ${user.name}`);
          console.log(`    Role: ${user.role.padEnd(20)} Status: ${user.status}`);
          if (user.managerId) {
            const manager = users.find(u => u.id === user.managerId);
            if (manager) {
              console.log(`    Manager: ${manager.email}`);
            }
          }
          console.log('');
        });
      }
    });

    console.log('\n📊 Summary:');
    console.log('─'.repeat(80));
    console.log(`Total users: ${users.length}`);
    console.log(`  • ADMIN: ${usersByRole.ADMIN.length}`);
    console.log(`  • LINE_MANAGER: ${usersByRole.LINE_MANAGER.length}`);
    console.log(`  • MANAGER: ${usersByRole.MANAGER.length}`);
    console.log(`  • STAFF: ${usersByRole.STAFF.length}`);

    // Check for @intersnack.com.vn emails
    const intersnackUsers = users.filter(u => u.email.endsWith('@intersnack.com.vn'));
    console.log(`\n✉️  Users with @intersnack.com.vn domain: ${intersnackUsers.length}`);

  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();
