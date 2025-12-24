// scripts/check-cycles.js - Check and seed cycles + users
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Real test users with proper emails (NO MOCK DATA)
// Email-based role determination:
// - admin@intersnack.com.vn → ADMIN (Full access + Proxy approval)
// - linemanager@intersnack.com.vn → LINE_MANAGER (Level 1 Approver)
// - hod@intersnack.com.vn → MANAGER (Level 2 Approver - Final)
// - Any other @intersnack.com.vn → STAFF
const TEST_USERS = [
  {
    email: 'admin@intersnack.com.vn',
    name: 'Bich Tram Nguyen', // Display format: FirstName LastName
    role: 'ADMIN',
    department: 'Administration',
    employeeId: 'VICC-ADM-001'
  },
  {
    email: 'linemanager@intersnack.com.vn',
    name: 'Hung Dang',
    role: 'LINE_MANAGER',
    department: 'Management',
    employeeId: 'VICC-LM-001'
  },
  {
    email: 'hod@intersnack.com.vn',
    name: 'Viet Cuong Nguyen',
    role: 'MANAGER',
    department: 'Executive',
    employeeId: 'VICC-MGR-001'
  },
  {
    email: 'ngan.ngo@intersnack.com.vn',
    name: 'Ngan Ngo', // STAFF user example
    role: 'STAFF',
    department: 'R&D',
    employeeId: 'VICC-RD-001'
  },
  {
    email: 'dieu.le@intersnack.com.vn',
    name: 'Dieu Le', // Another STAFF user
    role: 'STAFF',
    department: 'Marketing',
    employeeId: 'VICC-MKT-001'
  }
]

async function main() {
  console.log('=== Seeding Database ===\n')

  // 1. Create/Check Org Units
  console.log('1. Checking Org Units...')
  let orgUnit = await prisma.orgUnit.findFirst({
    where: { type: 'COMPANY' }
  })

  if (!orgUnit) {
    console.log('   Creating root org unit (VICC)...')
    orgUnit = await prisma.orgUnit.create({
      data: {
        name: 'VICC - Intersnack Vietnam',
        type: 'COMPANY'
      }
    })
    console.log(`   ✓ Created org unit: ${orgUnit.name}`)
  } else {
    console.log(`   ✓ Org unit exists: ${orgUnit.name}`)
  }

  // 2. Create/Check Users (using email as primary identifier, NO hardcoded IDs)
  console.log('\n2. Checking Users...')
  const createdUsers = []

  for (const userData of TEST_USERS) {
    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (!user) {
      // Check if employeeId already exists
      const existingEmployeeId = await prisma.user.findUnique({
        where: { employeeId: userData.employeeId }
      })

      // Create new user with auto-generated UUID
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          department: userData.department,
          employeeId: existingEmployeeId ? `${userData.employeeId}-${Date.now()}` : userData.employeeId,
          status: 'ACTIVE',
          orgUnitId: orgUnit.id,
          locale: 'vi-VN'
        }
      })
      console.log(`   ✓ Created user: ${user.name} (${user.role}) - ${user.email}`)
      console.log(`     ID: ${user.id}`)
    } else {
      console.log(`   ✓ User exists: ${user.name} (${user.role}) - ${user.email}`)
    }

    createdUsers.push(user)
  }

  // Set up manager relationships
  console.log('\n   Setting up manager relationships...')
  const admin = createdUsers.find(u => u.role === 'ADMIN')
  const manager = createdUsers.find(u => u.role === 'MANAGER')
  const lineManager = createdUsers.find(u => u.role === 'LINE_MANAGER')
  const staffUsers = createdUsers.filter(u => u.role === 'STAFF')

  // STAFF → LINE_MANAGER → MANAGER
  if (lineManager && staffUsers.length > 0) {
    for (const staff of staffUsers) {
      await prisma.user.update({
        where: { id: staff.id },
        data: { managerId: lineManager.id }
      })
    }
    console.log(`   ✓ Assigned Line Manager (${lineManager.name}) to ${staffUsers.length} staff member(s)`)
  }

  if (manager && lineManager) {
    await prisma.user.update({
      where: { id: lineManager.id },
      data: { managerId: manager.id }
    })
    console.log(`   ✓ Assigned Manager (${manager.name}) to Line Manager (${lineManager.name})`)
  }

  // 3. Check Cycles
  console.log('\n3. Checking Cycles...')
  const cycles = await prisma.cycle.findMany({
    orderBy: { createdAt: 'desc' }
  })

  console.log(`   Found ${cycles.length} cycle(s) in database`)
  cycles.forEach(cycle => {
    console.log(`   - ${cycle.name} (${cycle.type}) - Status: ${cycle.status}`)
    console.log(`     Period: ${cycle.periodStart.toISOString().split('T')[0]} to ${cycle.periodEnd.toISOString().split('T')[0]}`)
  })

  // Check for active/open cycles
  const activeCycles = cycles.filter(c => c.status === 'ACTIVE' || c.status === 'OPEN')

  if (activeCycles.length === 0) {
    console.log('\n   No ACTIVE or OPEN cycles found!')
    console.log('   Creating a test cycle...')

    // Get admin user by email (no hardcoded IDs)
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@intersnack.com.vn' }
    })

    if (!admin) {
      console.error('   ✗ ERROR: Admin user not found!')
      process.exit(1)
    }

    // Create cycle for current year
    const year = new Date().getFullYear()
    const cycle = await prisma.cycle.create({
      data: {
        name: `KPI Cycle ${year}`,
        type: 'ANNUAL',
        periodStart: new Date(`${year}-01-01`),
        periodEnd: new Date(`${year}-12-31`),
        status: 'ACTIVE',
        createdBy: admin.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log(`\n   ✓ Created cycle: ${cycle.name}`)
    console.log(`     ID: ${cycle.id}`)
    console.log(`     Status: ${cycle.status}`)
    console.log(`     Period: ${cycle.periodStart.toISOString().split('T')[0]} to ${cycle.periodEnd.toISOString().split('T')[0]}`)
  } else {
    console.log(`\n   ✓ Found ${activeCycles.length} active/open cycle(s)`)
  }

  console.log('\n=== Database Seeding Complete ===\n')
}

main()
  .catch((error) => {
    console.error('\n✗ ERROR:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
