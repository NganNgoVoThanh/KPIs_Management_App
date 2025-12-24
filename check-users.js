const mysql = require('mysql2/promise');

async function checkUsers() {
  const connectionString = "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={\"rejectUnauthorized\":true}";

  try {
    const connection = await mysql.createConnection(connectionString);
    console.log('✅ Connected to TiDB');

    // Check if User table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'User'");
    console.log('User table exists:', tables.length > 0);

    if (tables.length > 0) {
      // Count users
      const [count] = await connection.execute('SELECT COUNT(*) as total FROM User');
      console.log('Total users:', count[0].total);

      // Check for specific user
      const [users] = await connection.execute("SELECT id, name, email, role FROM User WHERE email LIKE '%intersnack.com.vn' LIMIT 10");
      console.log('\nUsers with @intersnack.com.vn email:');
      users.forEach(u => console.log('  - ' + u.email + ' (' + u.role + ') - ' + (u.name || 'No name')));

      // Check specific user
      const [specificUser] = await connection.execute("SELECT id, name, email, role FROM User WHERE email = 'ngan.ngo@intersnack.com.vn'");
      if (specificUser.length > 0) {
        console.log('\n✅ User ngan.ngo@intersnack.com.vn found:');
        console.log(specificUser[0]);
      } else {
        console.log('\n❌ User ngan.ngo@intersnack.com.vn NOT found');
      }
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
