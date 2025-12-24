const mysql = require('mysql2/promise');

async function checkTables() {
  const connectionString = "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={\"rejectUnauthorized\":true}";

  try {
    const connection = await mysql.createConnection(connectionString);
    console.log('✅ Connected to TiDB');

    // Show all tables
    const [tables] = await connection.execute("SHOW TABLES");
    console.log('\nAll tables in database:');
    if (tables.length === 0) {
      console.log('  (No tables found)');
    } else {
      tables.forEach(t => console.log('  -', Object.values(t)[0]));
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
