// scripts/check-tidb-tables.js
// Check what tables exist in TiDB database

const mysql = require('mysql2/promise')

async function checkTables() {
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
    console.log('✅ Connected to TiDB Cloud')
    console.log('📊 Database: test')
    console.log('')

    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES')

    if (tables.length === 0) {
      console.log('❌ No tables found in database')
      console.log('')
      console.log('You need to run Prisma migrations first:')
      console.log('  npx prisma migrate deploy')
      console.log('  or')
      console.log('  npx prisma db push')
    } else {
      console.log(`Found ${tables.length} tables:`)
      console.log('='.repeat(80))

      for (const table of tables) {
        const tableName = table[Object.keys(table)[0]]
        console.log(`📋 ${tableName}`)

        // Get row count
        try {
          const [count] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``)
          console.log(`   Rows: ${count[0].count}`)
        } catch (e) {
          console.log(`   Rows: Error - ${e.message}`)
        }
        console.log('')
      }

      console.log('='.repeat(80))
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await connection.end()
  }
}

checkTables()
