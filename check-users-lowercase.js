const mysql = require('mysql2/promise');

async function checkUsers() {
  const connectionString = "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={\"rejectUnauthorized\":true}";

  try {
    const connection = await mysql.createConnection(connectionString);
    console.log('✅ Connected to TiDB');

    // Count users
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM users');
    console.log('Total users:', count[0].total);

    // Check for specific user
    const [users] = await connection.execute("SELECT id, name, email, role FROM users WHERE email LIKE '%intersnack.com.vn' LIMIT 10");
    console.log('\nUsers with @intersnack.com.vn email:');
    users.forEach(u => console.log('  - ' + u.email + ' (' + u.role + ') - ' + (u.name || 'No name')));

    // Check specific user
    const [specificUser] = await connection.execute("SELECT id, name, email, role, password FROM users WHERE email = 'ngan.ngo@intersnack.com.vn'");
    if (specificUser.length > 0) {
      console.log('\n✅ User ngan.ngo@intersnack.com.vn found:');
      console.log(specificUser[0]);
    } else {
      console.log('\n❌ User ngan.ngo@intersnack.com.vn NOT found');
      console.log('\nAll users in database:');
      const [allUsers] = await connection.execute("SELECT id, name, email, role FROM users LIMIT 20");
      allUsers.forEach(u => console.log('  - ' + u.email + ' (' + u.role + ')'));
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
