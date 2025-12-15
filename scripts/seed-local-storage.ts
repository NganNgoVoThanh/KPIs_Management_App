// scripts/seed-local-storage.ts
// Seed data for local storage development

import { DatabaseFactory } from '../lib/repositories/DatabaseFactory'

async function seedLocalStorage() {
  console.log('🌱 Seeding local storage with sample data...\n')

  // Set DB_TYPE to local for this script
  process.env.DB_TYPE = 'local'

  const db = DatabaseFactory.getInstance()
  await db.connect()

  try {
    // 1. Create Organization Units
    console.log('📁 Creating organization units...')

    const company = await db.createOrgUnit({
      id: 'org-company-1',
      name: 'Intersnack Vietnam',
      type: 'COMPANY',
      parentId: null,
    })
    console.log('  ✅ Created company:', company.name)

    const salesDept = await db.createOrgUnit({
      id: 'org-sales-1',
      name: 'Sales Department',
      type: 'DEPARTMENT',
      parentId: company.id,
    })
    console.log('  ✅ Created department:', salesDept.name)

    const techDept = await db.createOrgUnit({
      id: 'org-tech-1',
      name: 'Technology Department',
      type: 'DEPARTMENT',
      parentId: company.id,
    })
    console.log('  ✅ Created department:', techDept.name)

    // 2. Create Users
    console.log('\n👥 Creating users...')

    const admin = await db.createUser({
      id: 'user-admin-1',
      email: 'admin@intersnack.com.vn',
      name: 'Admin User',
      role: 'ADMIN',
      orgUnitId: company.id,
      status: 'ACTIVE',
      employeeId: 'EMP001',
    })
    console.log('  ✅ Created admin:', admin.email)

    const manager = await db.createUser({
      id: 'user-manager-1',
      email: 'manager@intersnack.com.vn',
      name: 'Manager',
      role: 'MANAGER',
      orgUnitId: salesDept.id,
      department: 'Sales',
      status: 'ACTIVE',
      employeeId: 'EMP002',
    })
    console.log('  ✅ Created manager:', manager.email)

    const lineManager = await db.createUser({
      id: 'user-lm-1',
      email: 'linemanager@intersnack.com.vn',
      name: 'Line Manager',
      role: 'LINE_MANAGER',
      orgUnitId: techDept.id,
      department: 'Technology',
      status: 'ACTIVE',
      employeeId: 'EMP003',
      managerId: manager.id,
    })
    console.log('  ✅ Created line manager:', lineManager.email)

    const nganNgo = await db.createUser({
      id: 'user-ngan-ngo',
      email: 'ngan.ngo@intersnack.com.vn',
      name: 'Ngan Ngo',
      role: 'STAFF',
      orgUnitId: salesDept.id,
      department: 'Sales',
      status: 'ACTIVE',
      employeeId: 'EMP004',
      managerId: lineManager.id,
    })
    console.log('  ✅ Created staff:', nganNgo.email)

    const dieuLe = await db.createUser({
      id: 'user-dieu-le',
      email: 'dieu.le@intersnack.com.vn',
      name: 'Dieu Le',
      role: 'STAFF',
      orgUnitId: techDept.id,
      department: 'Technology',
      status: 'ACTIVE',
      employeeId: 'EMP005',
      managerId: lineManager.id,
    })
    console.log('  ✅ Created staff:', dieuLe.email)

    // 3. Create Approval Hierarchy
    console.log('\n🔐 Creating approval hierarchy...')

    await db.createApprovalHierarchy({
      id: 'approval-hierarchy-1',
      userId: nganNgo.id,
      level1ApproverId: lineManager.id,
      level2ApproverId: manager.id,
      effectiveFrom: new Date().toISOString(),
      isActive: true,
      createdBy: admin.id,
    })
    console.log('  ✅ Created hierarchy for:', nganNgo.name)

    await db.createApprovalHierarchy({
      id: 'approval-hierarchy-2',
      userId: dieuLe.id,
      level1ApproverId: lineManager.id,
      level2ApproverId: manager.id,
      effectiveFrom: new Date().toISOString(),
      isActive: true,
      createdBy: admin.id,
    })
    console.log('  ✅ Created hierarchy for:', dieuLe.name)

    // 4. Create Cycle
    console.log('\n📅 Creating cycle...')

    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31)

    const cycle = await db.createCycle({
      id: 'cycle-2025',
      name: 'Annual Performance 2025',
      type: 'YEARLY',
      periodStart: yearStart.toISOString(),
      periodEnd: yearEnd.toISOString(),
      status: 'ACTIVE',
      createdBy: admin.id,
      settings: {
        allowLateSubmission: false,
        requireEvidence: true,
        minKpisPerUser: 3,
        maxKpisPerUser: 10,
        totalWeightMustEqual: 100,
        autoNotifyUsers: true,
      },
    })
    console.log('  ✅ Created cycle:', cycle.name)

    // 5. Create Sample KPI Definitions
    console.log('\n🎯 Creating sample KPI definitions...')

    const kpi1 = await db.createKpiDefinition({
      id: 'kpi-1',
      cycleId: cycle.id,
      userId: nganNgo.id,
      orgUnitId: salesDept.id,
      title: 'Increase Monthly Sales Revenue',
      description: 'Achieve monthly sales target of $50,000',
      type: 'QUANT_HIGHER_BETTER',
      unit: 'USD',
      target: 50000,
      weight: 40,
      dataSource: 'Sales CRM System',
      ownerId: nganNgo.id,
      status: 'DRAFT',
    })
    console.log('  ✅ Created KPI:', kpi1.title)

    const kpi2 = await db.createKpiDefinition({
      id: 'kpi-2',
      cycleId: cycle.id,
      userId: nganNgo.id,
      orgUnitId: salesDept.id,
      title: 'Reduce Customer Complaints',
      description: 'Maintain customer complaints below 5 per month',
      type: 'QUANT_LOWER_BETTER',
      unit: 'complaints',
      target: 5,
      weight: 30,
      dataSource: 'Support Ticketing System',
      ownerId: nganNgo.id,
      status: 'DRAFT',
    })
    console.log('  ✅ Created KPI:', kpi2.title)

    const kpi3 = await db.createKpiDefinition({
      id: 'kpi-3',
      cycleId: cycle.id,
      userId: dieuLe.id,
      orgUnitId: techDept.id,
      title: 'Complete Project Migration',
      description: 'Migrate all legacy systems to cloud by Q4',
      type: 'MILESTONE',
      unit: 'milestone',
      target: 1,
      weight: 50,
      dataSource: 'Project Management System',
      ownerId: dieuLe.id,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    })
    console.log('  ✅ Created KPI:', kpi3.title)

    // 6. Create Sample KPI Library Entries
    console.log('\n📚 Creating KPI library entries...')

    await db.createKpiLibraryEntry({
      id: 'lib-1',
      stt: 1,
      ogsmTarget: 'Increase Revenue',
      department: 'Sales',
      jobTitle: 'Sales Executive',
      kpiName: 'Monthly Sales Target Achievement',
      kpiType: 'I',
      unit: 'USD',
      dataSource: 'CRM',
      yearlyTarget: 600000,
      quarterlyTarget: 150000,
      uploadedBy: admin.id,
      status: 'ACTIVE',
      version: 1,
      isTemplate: true,
    })
    console.log('  ✅ Created library entry: Monthly Sales Target Achievement')

    await db.createKpiLibraryEntry({
      id: 'lib-2',
      stt: 2,
      ogsmTarget: 'Improve Customer Satisfaction',
      department: 'Support',
      jobTitle: 'Support Manager',
      kpiName: 'Customer Satisfaction Score (CSAT)',
      kpiType: 'I',
      unit: '%',
      dataSource: 'Survey',
      yearlyTarget: 95,
      quarterlyTarget: 90,
      uploadedBy: admin.id,
      status: 'ACTIVE',
      version: 1,
      isTemplate: true,
      version: 1,
    })
    console.log('  ✅ Created library entry: Customer Satisfaction Score')

    // 7. Create Sample KPI Templates (New Unified System)
    console.log('\n📝 Creating KPI templates...')

    await db.createKpiTemplate({
      id: 'template-sales-growth',
      name: 'Revenue Growth',
      description: 'Increase overall revenue compared to previous period',
      department: 'Sales',
      category: 'FINANCIAL',
      kpiType: 'QUANT_HIGHER_BETTER',
      unit: '%',
      targetValue: 15,
      weight: 30,
      tags: ['growth', 'revenue', 'sales'],
      status: 'APPROVED',
      source: 'MANUAL',
      createdBy: admin.id,
      isActive: true
    })
    console.log('  ✅ Created template: Revenue Growth')

    await db.createKpiTemplate({
      id: 'template-hiring',
      name: 'Time to Hire',
      description: 'Average time to fill a vacant position',
      department: 'HR',
      category: 'OPERATIONAL',
      kpiType: 'QUANT_LOWER_BETTER',
      unit: 'days',
      targetValue: 45,
      weight: 20,
      tags: ['recruitment', 'hr', 'efficiency'],
      status: 'APPROVED',
      source: 'MANUAL',
      createdBy: admin.id,
      isActive: true
    })
    console.log('  ✅ Created template: Time to Hire')

    await db.createKpiTemplate({
      id: 'template-dev-velocity',
      name: 'Sprint Velocity',
      description: 'Average story points completed per sprint',
      department: 'Technology',
      category: 'OPERATIONAL',
      kpiType: 'QUANT_HIGHER_BETTER',
      unit: 'points',
      targetValue: 40,
      weight: 25,
      tags: ['agile', 'scrum', 'productivity'],
      status: 'APPROVED',
      source: 'MANUAL',
      createdBy: admin.id,
      isActive: true
    })
    console.log('  ✅ Created template: Sprint Velocity')

    // 8. Create Sample KPI Resources
    console.log('\n📂 Creating KPI resources...')

    await db.createKpiResource({
      id: 'res-guide-1',
      title: 'KPI Best Practices Guide 2025',
      description: 'Comprehensive guide on how to set SMART goals',
      category: 'GUIDE',
      resourceType: 'FILE',
      fileName: 'KPI_Best_Practices_2025.pdf',
      fileType: 'pdf',
      fileSize: 2500000,
      mimeType: 'application/pdf',
      storageProvider: 'LOCAL',
      // Mock base64 for PDF icon
      storageUrl: 'data:application/pdf;base64,JVBERi0xL...',
      department: 'HR',
      tags: ['guide', 'best-practices', 'smart-goals'],
      uploadedBy: admin.id,
      isPublic: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      approvedBy: admin.id,
      downloadCount: 15
    })
    console.log('  ✅ Created resource: KPI Best Practices Guide')

    await db.createKpiResource({
      id: 'res-dashboard-1',
      title: 'Company Performance Dashboard',
      description: 'Real-time overview of company-wide KPIs',
      category: 'DASHBOARD',
      resourceType: 'BI_DASHBOARD',
      dashboardType: 'POWER_BI',
      dashboardUrl: 'https://app.powerbi.com/groups/me/reports/mock-report-id',
      department: 'Management',
      tags: ['overview', 'executive', 'real-time'],
      uploadedBy: admin.id,
      isPublic: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      approvedBy: admin.id,
      viewCount: 42,
      isFeatured: true
    })
    console.log('  ✅ Created resource: Company Performance Dashboard')

    // 7. Create Notifications
    console.log('\n🔔 Creating sample notifications...')

    await db.createNotification({
      id: 'notif-1',
      userId: nganNgo.id,
      type: 'CYCLE_OPENED',
      title: 'New Performance Cycle Started',
      message: `The performance cycle "${cycle.name}" has been opened. Please set your KPIs.`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: '/kpi/create',
    })
    console.log('  ✅ Created notification for:', nganNgo.name)

    await db.createNotification({
      id: 'notif-2',
      userId: dieuLe.id,
      type: 'CYCLE_OPENED',
      title: 'New Performance Cycle Started',
      message: `The performance cycle "${cycle.name}" has been opened. Please set your KPIs.`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: '/kpi/create',
    })
    console.log('  ✅ Created notification for:', dieuLe.name)

    console.log('\n✨ Seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log('  - Organization Units: 3')
    console.log('  - Users: 5 (1 Admin, 1 Manager, 1 Line Manager, 2 Staff)')
    console.log('  - Cycles: 1 (Active)')
    console.log('  - KPI Definitions: 3')
    console.log('  - KPI Library Entries: 2')
    console.log('  - Notifications: 2')
    console.log('\n🎉 You can now login with:')
    console.log('  - Admin: admin@intersnack.com.vn')
    console.log('  - Manager: manager@intersnack.com.vn')
    console.log('  - Line Manager: linemanager@intersnack.com.vn')
    console.log('  - Staff: ngan.ngo@intersnack.com.vn or dieu.le@intersnack.com.vn')
    console.log('\n💡 Data is stored in: .local-storage/')
    console.log('💡 To reset: delete the .local-storage/ folder and run this script again')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  } finally {
    await db.disconnect()
  }
}

// Run the seeding
seedLocalStorage()
  .then(() => {
    console.log('\n👋 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
