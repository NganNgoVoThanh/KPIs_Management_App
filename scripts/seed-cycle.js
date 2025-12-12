// scripts/seed-cycle.js - Seed a performance cycle for testing
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding performance cycle...')

  // Find admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!admin) {
    console.error('❌ No admin user found. Please create an admin user first.')
    return
  }

  console.log(`✅ Found admin: ${admin.name} (${admin.email})`)

  // Check if cycle already exists
  const existingCycle = await prisma.cycle.findFirst({
    where: { name: '2025 Annual Performance Review' }
  })

  if (existingCycle) {
    console.log(`✅ Cycle already exists: ${existingCycle.name} (Status: ${existingCycle.status})`)

    if (existingCycle.status === 'DRAFT') {
      console.log(`\nℹ️  To activate this cycle:`)
      console.log(`   1. Login as Admin`)
      console.log(`   2. Go to Cycles page`)
      console.log(`   3. Click "Activate" button on the cycle`)
    }

    return
  }

  // Create new cycle
  const cycle = await prisma.cycle.create({
    data: {
      name: '2025 Annual Performance Review',
      type: 'YEARLY',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-12-31'),
      status: 'DRAFT',
      createdBy: admin.id,
      settings: {
        minKpisPerUser: 3,
        maxKpisPerUser: 5,
        allowSelfEvaluation: true,
        requireManagerApproval: true,
        enableMidYearReview: true
      },
      targetUsers: null
    }
  })

  console.log(`\n✅ Created cycle: ${cycle.name}`)
  console.log(`   ID: ${cycle.id}`)
  console.log(`   Type: ${cycle.type}`)
  console.log(`   Period: ${cycle.periodStart.toISOString().split('T')[0]} to ${cycle.periodEnd.toISOString().split('T')[0]}`)
  console.log(`   Status: ${cycle.status}`)

  console.log(`\n✅ Seed completed successfully!`)
  console.log(`\nNext steps:`)
  console.log(`   1. Login as Admin`)
  console.log(`   2. Go to Cycles page (/cycles)`)
  console.log(`   3. Click "Activate" button on the "2025 Annual Performance Review" cycle`)
  console.log(`   4. Users can now create KPIs!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding cycle:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
