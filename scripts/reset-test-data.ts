/**
 * Script to reset test data
 * Run: npx tsx scripts/reset-test-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting data reset...')

  try {
    // 1. Reset all KPIs to DRAFT
    const kpisUpdated = await prisma.kpiDefinition.updateMany({
      data: {
        status: 'DRAFT',
        submittedAt: null,
        approvedAt: null,
        approvedByLevel1: null,
        approvedByLevel2: null,
        approvedAtLevel1: null,
        approvedAtLevel2: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null
      }
    })
    console.log(`✅ Reset ${kpisUpdated.count} KPIs to DRAFT`)

    // 2. Cancel all approvals
    const approvalsUpdated = await prisma.approval.updateMany({
      where: {
        status: {
          in: ['PENDING', 'APPROVED', 'REJECTED']
        }
      },
      data: {
        status: 'CANCELLED',
        decidedAt: new Date()
      }
    })
    console.log(`✅ Cancelled ${approvalsUpdated.count} approvals`)

    // 3. Soft delete all notifications
    const notificationsUpdated = await prisma.notification.updateMany({
      where: {
        status: {
          not: 'DELETED'
        }
      },
      data: {
        status: 'DELETED',
        readAt: new Date()
      }
    })
    console.log(`✅ Deleted ${notificationsUpdated.count} notifications`)

    console.log('\n✨ Data reset completed successfully!')
    console.log('\nSummary:')
    console.log(`  - KPIs reset to DRAFT: ${kpisUpdated.count}`)
    console.log(`  - Approvals cancelled: ${approvalsUpdated.count}`)
    console.log(`  - Notifications deleted: ${notificationsUpdated.count}`)

  } catch (error) {
    console.error('❌ Error resetting data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
