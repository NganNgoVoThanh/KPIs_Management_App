const mysql = require('mysql2/promise');

async function checkSchema() {
  const connectionString = "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={\"rejectUnauthorized\":true}";

  try {
    const connection = await mysql.createConnection(connectionString);
    console.log('✅ Connected to TiDB');

    // Show table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('\nColumns in users table:');
    columns.forEach(col => console.log('  - ' + col.Field + ' (' + col.Type + ')'));

    // Get specific user
    const [users] = await connection.execute("SELECT * FROM users WHERE email = 'ngan.ngo@intersnack.com.vn'");
    if (users.length > 0) {
      console.log('\nUser ngan.ngo@intersnack.com.vn data:');
      console.log(users[0]);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
