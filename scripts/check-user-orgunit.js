// scripts/check-user-orgunit.js - Check user and orgUnit IDs
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Checking User and OrgUnit IDs ===\n')

  // Check user
  const user = await prisma.user.findUnique({
    where: { id: 'user-VICC-ADM-001' },
    select: { id: true, name: true, orgUnitId: true, email: true }
  })

  console.log('Admin User:')
  console.log(JSON.stringify(user, null, 2))

  // Check org units
  const orgs = await prisma.orgUnit.findMany({
    select: { id: true, name: true, type: true }
  })

  console.log('\nOrg Units:')
  orgs.forEach(org => {
    console.log(`  - ${org.name} (${org.type})`)
    console.log(`    ID: ${org.id}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
