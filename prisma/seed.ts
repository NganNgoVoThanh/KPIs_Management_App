import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Company
  const company = await prisma.orgUnit.create({
    data: {
      id: 'org-company',
      name: 'VICC - Intersnack Vietnam',
      type: 'COMPANY'
    }
  })

  // Create Departments
  const departments = await Promise.all([
    prisma.orgUnit.create({
      data: {
        name: 'HR & Admin',
        parentId: company.id,
        type: 'DEPARTMENT'
      }
    }),
    prisma.orgUnit.create({
      data: {
        name: 'R&D',
        parentId: company.id,
        type: 'DEPARTMENT'
      }
    }),
    prisma.orgUnit.create({
      data: {
        name: 'Production',
        parentId: company.id,
        type: 'DEPARTMENT'
      }
    }),
    prisma.orgUnit.create({
      data: {
        name: 'QA/QC',
        parentId: company.id,
        type: 'DEPARTMENT'
      }
    })
  ])

  // Create Admin/HR User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@intersnack.com.vn',
      name: 'Admin User',
      role: 'ADMIN',
      orgUnitId: departments[0].id,
      department: 'HR & Admin',
      employeeId: 'EMP001',
      status: 'ACTIVE'
    }
  })

  // Create BOD
  const bod = await prisma.user.create({
    data: {
      email: 'bod@intersnack.com.vn',
      name: 'Board Member',
      role: 'BOD',
      orgUnitId: company.id,
      department: 'Executive',
      employeeId: 'EMP002',
      status: 'ACTIVE'
    }
  })

  // Create Line Manager
  const lineManager = await prisma.user.create({
    data: {
      email: 'manager@intersnack.com.vn',
      name: 'Line Manager',
      role: 'LINE_MANAGER',
      orgUnitId: departments[1].id,
      department: 'R&D',
      employeeId: 'EMP003',
      status: 'ACTIVE'
    }
  })

  // Create Staff
  const staff = await prisma.user.create({
    data: {
      email: 'staff@intersnack.com.vn',
      name: 'Staff Member',
      role: 'STAFF',
      orgUnitId: departments[1].id,
      department: 'R&D',
      employeeId: 'EMP004',
      managerId: lineManager.id,
      status: 'ACTIVE'
    }
  })

  // Create a Cycle
  const cycle = await prisma.cycle.create({
    data: {
      name: '2025 Annual Performance Review',
      type: 'YEARLY',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-12-31'),
      status: 'ACTIVE',
      createdBy: admin.id
    }
  })

  console.log('Database seeded successfully!')
  console.log({
    company,
    departments: departments.length,
    users: {
      admin: admin.email,
      bod: bod.email,
      lineManager: lineManager.email,
      staff: staff.email
    },
    cycle: cycle.name
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })