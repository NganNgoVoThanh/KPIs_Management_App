// scripts/clear-tidb-data.js
// Clear ALL data from TiDB database (keeps table structure)

const mysql = require('mysql2/promise')

async function clearAllData() {
  const connection = await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '36ZBaPjQ2KHkNvy.root',
    password: 'A76iDK1uW6DcXDPk',
    database: 'test',
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  })

  try {
    console.log('🔗 Connected to TiDB Cloud')
    console.log('⚠️  WARNING: This will delete ALL data from the database!')
    console.log('')

    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0')
    console.log('✅ Disabled foreign key checks')

    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES')
    const tableNames = tables.map(t => t[Object.keys(t)[0]])

    console.log(`📋 Found ${tableNames.length} tables to clear`)
    console.log('')

    // Delete data from each table
    for (const tableName of tableNames) {
      try {
        const [result] = await connection.execute(`DELETE FROM \`${tableName}\``)
        console.log(`✅ Cleared table: ${tableName} (${result.affectedRows} rows deleted)`)
      } catch (error) {
        console.error(`❌ Error clearing ${tableName}:`, error.message)
      }
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1')
    console.log('')
    console.log('✅ Re-enabled foreign key checks')
    console.log('')
    console.log('🎉 All data cleared successfully!')
    console.log('📝 Table structures are preserved - ready for fresh data')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await connection.end()
  }
}

clearAllData()
