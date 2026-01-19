
const mysql = require('mysql2/promise');

const tidbConfig = {
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '36ZBaPjQ2KHkNvy.root',
    password: 'A76iDK1uW6DcXDPk',
    database: 'test',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    connectTimeout: 10000
};

async function testConnection() {
    console.log('🔌 Testing direct connection to TiDB...');
    console.log(`   Host: ${tidbConfig.host}`);
    console.log(`   User: ${tidbConfig.user}`);

    try {
        const connection = await mysql.createConnection(tidbConfig);
        console.log('✅ Connection established via mysql2!');

        const [rows] = await connection.execute('SELECT 1 as val');
        console.log('✅ Query success:', rows);

        await connection.end();
    } catch (error) {
        console.error('❌ Connection failed:');
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
    }
}

testConnection();
