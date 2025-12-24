const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing TiDB connection...');
  
  const connectionString = process.env.DATABASE_URL || "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict&tls=true";
  
  try {
    console.log('Attempting to connect to TiDB...');
    const connection = await mysql.createConnection(connectionString);
    console.log('✅ Successfully connected to TiDB!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    process.exit(1);
  }
}

testConnection();
