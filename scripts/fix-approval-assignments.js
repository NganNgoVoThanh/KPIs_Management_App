// scripts/fix-approval-assignments.js
// Fix existing approval assignments from ADMIN to LINE_MANAGER

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

async function fixApprovalAssignments() {
  console.log('=== FIXING APPROVAL ASSIGNMENTS ===\n')

  try {
    // Find LINE_MANAGER
    const lineManagers = await prisma.user.findMany({
      where: {
        role: 'LINE_MANAGER',
        status: 'ACTIVE'
      }
    })

    if (lineManagers.length === 0) {
      console.log('❌ No active LINE_MANAGER found. Cannot fix assignments.')
      return
    }

    const lineManager = lineManagers[0]
    console.log(`✅ Found LINE_MANAGER: ${lineManager.email} (${lineManager.name})`)
    console.log(`   ID: ${lineManager.id}\n`)

    // Find pending approvals assigned to ADMIN
    const adminApprovals = await prisma.approval.findMany({
      where: {
        status: 'PENDING',
        level: 1
      },
      include: {
        approver: true,
        kpiDefinition: {
          include: {
            user: true
          }
        }
      }
    })

    const wrongAssignments = adminApprovals.filter(a => a.approver.role === 'ADMIN')

    console.log(`Found ${wrongAssignments.length} approvals assigned to ADMIN that should go to LINE_MANAGER\n`)

    if (wrongAssignments.length === 0) {
      console.log('✅ No wrong assignments found. Everything is correct!')
      return
    }

    // Fix each approval
    for (const approval of wrongAssignments) {
      console.log(`Fixing approval for KPI: ${approval.kpiDefinition.title}`)
      console.log(`  Current approver: ${approval.approver.email} (${approval.approver.role})`)
      console.log(`  New approver: ${lineManager.email} (${lineManager.role})`)

      await prisma.approval.update({
        where: { id: approval.id },
        data: {
          approverId: lineManager.id,
          reassignedBy: approval.approverId,
          reassignedAt: new Date(),
          reassignReason: 'Reassigned from ADMIN to LINE_MANAGER (system fix)'
        }
      })

      // Update notification if exists
      const notifications = await prisma.notification.findMany({
        where: {
          userId: approval.approverId,
          actionUrl: '/approvals',
          status: 'UNREAD'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      })

      if (notifications.length > 0) {
        await prisma.notification.update({
          where: { id: notifications[0].id },
          data: {
            userId: lineManager.id
          }
        })
        console.log(`  ✅ Updated notification as well`)
      }

      console.log(`  ✅ Fixed!\n`)
    }

    console.log(`\n✅ Successfully fixed ${wrongAssignments.length} approval assignments!`)

    // Verify the fix
    console.log('\n=== VERIFICATION ===')
    const verifyApprovals = await prisma.approval.findMany({
      where: {
        approverId: lineManager.id,
        status: 'PENDING'
      },
      include: {
        kpiDefinition: true
      }
    })

    console.log(`\nLINE_MANAGER now has ${verifyApprovals.length} pending approvals:`)
    verifyApprovals.forEach(a => {
      console.log(`  - ${a.kpiDefinition.title}`)
    })

  } catch (error) {
    console.error('Error fixing approvals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixApprovalAssignments()
