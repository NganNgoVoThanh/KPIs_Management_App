// scripts/set-user-manager.js
// Set Line Manager as the manager for staff users

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

// Update DATABASE_URL to add sslaccept parameter
const dbUrl = process.env.DATABASE_URL
const urlWithSsl = dbUrl.includes('sslaccept') ? dbUrl : dbUrl.replace('ssl-mode=REQUIRED', 'sslaccept=strict')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: urlWithSsl
    }
  },
  log: ['error', 'warn']
})

async function setUserManager() {
  console.log('=== SETTING USER-MANAGER RELATIONSHIPS ===\n')

  try {
    // Find LINE_MANAGER
    const lineManagers = await prisma.user.findMany({
      where: {
        role: 'LINE_MANAGER',
        status: 'ACTIVE'
      }
    })

    if (lineManagers.length === 0) {
      console.log('❌ No active LINE_MANAGER found.')
      return
    }

    const lineManager = lineManagers[0]
    console.log(`✅ Found LINE_MANAGER: ${lineManager.email} (${lineManager.name})`)
    console.log(`   ID: ${lineManager.id}\n`)

    // Find STAFF users without a manager
    const staffWithoutManager = await prisma.user.findMany({
      where: {
        role: 'STAFF',
        status: 'ACTIVE',
        managerId: null
      }
    })

    console.log(`Found ${staffWithoutManager.length} STAFF users without a manager:\n`)

    if (staffWithoutManager.length === 0) {
      console.log('✅ All STAFF users already have a manager assigned.')
      return
    }

    // Update each staff user
    for (const staff of staffWithoutManager) {
      console.log(`Assigning manager to: ${staff.email} (${staff.name})`)

      await prisma.user.update({
        where: { id: staff.id },
        data: {
          managerId: lineManager.id
        }
      })

      console.log(`  ✅ Manager set to: ${lineManager.email}\n`)
    }

    console.log(`\n✅ Successfully assigned manager to ${staffWithoutManager.length} STAFF users!`)

    // Verification
    console.log('\n=== VERIFICATION ===')
    const allStaff = await prisma.user.findMany({
      where: {
        role: 'STAFF',
        status: 'ACTIVE'
      },
      select: {
        email: true,
        name: true,
        managerId: true,
        manager: {
          select: {
            email: true,
            name: true,
            role: true
          }
        }
      }
    })

    console.log(`\nAll STAFF users and their managers:`)
    allStaff.forEach(s => {
      if (s.manager) {
        console.log(`  - ${s.email}: Manager = ${s.manager.email} (${s.manager.role})`)
      } else {
        console.log(`  - ${s.email}: ❌ NO MANAGER`)
      }
    })

  } catch (error) {
    console.error('Error setting manager:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setUserManager()
