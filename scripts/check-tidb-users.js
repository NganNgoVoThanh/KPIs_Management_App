// scripts/check-tidb-users.js
// Check all users in TiDB database

const mysql = require('mysql2/promise')

async function checkUsers() {
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
    console.log('')

    // Get all users (lowercase 'users' table name)
    const [users] = await connection.execute('SELECT * FROM users ORDER BY createdAt')

    console.log(`Found ${users.length} users in database:`)
    console.log('='.repeat(80))

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Employee ID: ${user.employeeId}`)
      console.log(`   Status: ${user.status}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })

    console.log('='.repeat(80))
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await connection.end()
  }
}

checkUsers()
