// prisma/seed.ts - UPDATED: 4 roles with 2-level hierarchy
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with 4 roles + 2-level approval...')

  // Create Company
  const company = await prisma.orgUnit.upsert({
    where: { id: 'org-company' },
    update: {},
    create: {
      id: 'org-company',
      name: 'VICC - Intersnack Vietnam',
      type: 'COMPANY'
    }
  })

  // Create Departments
  const hrDept = await prisma.orgUnit.upsert({
    where: { id: 'org-hr' },
    update: {},
    create: {
      id: 'org-hr',
      name: 'HR & Admin',
      parentId: company.id,
      type: 'DEPARTMENT'
    }
  })

  const rdDept = await prisma.orgUnit.upsert({
    where: { id: 'org-rd' },
    update: {},
    create: {
      id: 'org-rd',
      name: 'R&D',
      parentId: company.id,
      type: 'DEPARTMENT'
    }
  })

  const prodDept = await prisma.orgUnit.upsert({
    where: { id: 'org-prod' },
    update: {},
    create: {
      id: 'org-prod',
      name: 'Production',
      parentId: company.id,
      type: 'DEPARTMENT'
    }
  })

  const qaDept = await prisma.orgUnit.upsert({
    where: { id: 'org-qa' },
    update: {},
    create: {
      id: 'org-qa',
      name: 'QA/QC',
      parentId: company.id,
      type: 'DEPARTMENT'
    }
  })

  console.log('✅ Created 4 departments')

  // ✅ 1. Create Manager (N+2) first - no manager above
  const manager = await prisma.user.upsert({
    where: { email: 'hod@intersnack.com.vn' },
    update: {},
    create: {
      email: 'hod@intersnack.com.vn',
      name: 'Nguyen Viet Cuong',
      role: 'MANAGER',
      orgUnitId: company.id,
      department: 'Executive',
      employeeId: 'VICC-EX-001',
      managerId: null,
      status: 'ACTIVE'
    }
  })

  // ✅ 2. Create Line Manager (N+1) - reports to Manager
  const lineManager = await prisma.user.upsert({
    where: { email: 'linemanager@intersnack.com.vn' },
    update: {},
    create: {
      email: 'linemanager@intersnack.com.vn',
      name: 'Dang Quoc Hung',
      role: 'LINE_MANAGER',
      orgUnitId: rdDept.id,
      department: 'R&D',
      employeeId: 'VICC-RD-002',
      managerId: manager.id,
      status: 'ACTIVE'
    }
  })

  // ✅ 3. Create Staff - reports to Line Manager
  const staff = await prisma.user.upsert({
    where: { email: 'staff@intersnack.com.vn' },
    update: {},
    create: {
      email: 'staff@intersnack.com.vn',
      name: 'Ngo Vo Thanh Ngan',
      role: 'STAFF',
      orgUnitId: rdDept.id,
      department: 'R&D',
      employeeId: 'VICC-RD-001',
      managerId: lineManager.id,
      status: 'ACTIVE'
    }
  })

  // ✅ 4. Create Admin - no manager
  const admin = await prisma.user.upsert({
    where: { email: 'admin@intersnack.com.vn' },
    update: {},
    create: {
      email: 'admin@intersnack.com.vn',
      name: 'Nguyen Thi Bich Tram',
      role: 'ADMIN',
      orgUnitId: hrDept.id,
      department: 'HR & Admin',
      employeeId: 'VICC-ADM-001',
      managerId: null,
      status: 'ACTIVE'
    }
  })

  console.log('✅ Created 4 users (ADMIN, STAFF, LINE_MANAGER, MANAGER)')

  // ✅ Create Approval Hierarchy for Staff (2 levels)
  const hierarchy = await prisma.approvalHierarchy.create({
    data: {
      userId: staff.id,
      level1ApproverId: lineManager.id,  // N+1
      level2ApproverId: manager.id,      // N+2
      effectiveFrom: new Date(),
      createdBy: admin.id,
      isActive: true
    }
  })

  console.log('✅ Created 2-level approval hierarchy')

  // Create a Cycle
  const cycle = await prisma.cycle.upsert({
    where: { id: 'cycle-2025' },
    update: {},
    create: {
      id: 'cycle-2025',
      name: '2025 Annual Performance Review',
      type: 'YEARLY',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-12-31'),
      status: 'ACTIVE',
      createdBy: admin.id
    }
  })

  console.log('✅ Created active cycle')

  // Create sample KPI for testing
  const sampleKpi = await prisma.kpiDefinition.create({
    data: {
      cycleId: cycle.id,
      userId: staff.id,
      orgUnitId: rdDept.id,
      title: 'Reduce Internal NCR',
      description: 'Reduce internal non-conformance reports in Q1',
      type: 'QUANT_LOWER_BETTER',
      unit: 'cases',
      target: 5,
      weight: 20,
      dataSource: 'eQMS',
      ownerId: staff.id,
      status: 'DRAFT'
    }
  })

  console.log('✅ Created sample KPI')

  console.log('\n🎉 Database seeded successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 SUMMARY:')
  console.log({
    company: company.name,
    departments: 4,
    users: {
      admin: `${admin.name} <${admin.email}>`,
      manager: `${manager.name} <${manager.email}>`,
      lineManager: `${lineManager.name} <${lineManager.email}>`,
      staff: `${staff.name} <${staff.email}>`
    },
    approvalHierarchy: {
      for: staff.name,
      level1: `${lineManager.name} (N+1)`,
      level2: `${manager.name} (N+2)`
    },
    cycle: cycle.name,
    sampleKpi: sampleKpi.title
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })