// scripts/diagnose-approvals.js
// Diagnose approval flow issues

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

async function diagnoseApprovals() {
  console.log('=== APPROVAL FLOW DIAGNOSTICS ===\n')

  try {
    // 1. Check users and their roles
    console.log('1️⃣ USERS & ROLES:')
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        managerId: true,
        department: true
      }
    })

    console.log(`Total active users: ${users.length}`)
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.name}) | Role: ${u.role} | Dept: ${u.department} | Manager: ${u.managerId || 'NONE'}`)
    })

    // 2. Check KPIs with WAITING_LINE_MGR status
    console.log('\n2️⃣ KPIs WAITING FOR LINE MANAGER APPROVAL:')
    const waitingKpis = await prisma.kpiDefinition.findMany({
      where: { status: 'WAITING_LINE_MGR' },
      select: {
        id: true,
        title: true,
        userId: true,
        status: true,
        submittedAt: true,
        user: {
          select: {
            email: true,
            name: true,
            role: true,
            managerId: true
          }
        }
      }
    })

    console.log(`Total KPIs in WAITING_LINE_MGR status: ${waitingKpis.length}`)
    waitingKpis.forEach(kpi => {
      console.log(`  - KPI: ${kpi.title}`)
      console.log(`    ID: ${kpi.id}`)
      console.log(`    Owner: ${kpi.user.email} (${kpi.user.name})`)
      console.log(`    Owner's Manager ID: ${kpi.user.managerId || 'NONE'}`)
      console.log(`    Submitted at: ${kpi.submittedAt}`)
    })

    // 3. Check approval records for these KPIs
    console.log('\n3️⃣ APPROVAL RECORDS FOR WAITING KPIs:')
    for (const kpi of waitingKpis) {
      const approvals = await prisma.approval.findMany({
        where: {
          kpiDefinitionId: kpi.id
        },
        include: {
          approver: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      })

      console.log(`\n  KPI: ${kpi.title} (${kpi.id})`)
      if (approvals.length === 0) {
        console.log(`    ❌ NO APPROVAL RECORDS FOUND!`)
      } else {
        approvals.forEach(approval => {
          console.log(`    - Approval ID: ${approval.id}`)
          console.log(`      Approver: ${approval.approver.email} (${approval.approver.name})`)
          console.log(`      Approver ID: ${approval.approverId}`)
          console.log(`      Status: ${approval.status}`)
          console.log(`      Level: ${approval.level}`)
          console.log(`      Created: ${approval.createdAt}`)
        })
      }
    }

    // 4. Check approvals by role
    console.log('\n4️⃣ PENDING APPROVALS BY APPROVER ROLE:')
    const pendingApprovals = await prisma.approval.findMany({
      where: { status: 'PENDING' },
      include: {
        approver: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        },
        kpiDefinition: {
          select: {
            id: true,
            title: true,
            status: true,
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log(`Total pending approvals: ${pendingApprovals.length}`)

    // Group by approver
    const byApprover = {}
    pendingApprovals.forEach(approval => {
      const email = approval.approver.email
      if (!byApprover[email]) {
        byApprover[email] = {
          approver: approval.approver,
          approvals: []
        }
      }
      byApprover[email].approvals.push(approval)
    })

    Object.values(byApprover).forEach(({ approver, approvals }) => {
      console.log(`\n  Approver: ${approver.email} (${approver.name}) - Role: ${approver.role}`)
      console.log(`  Pending count: ${approvals.length}`)
      approvals.forEach(a => {
        console.log(`    - KPI: ${a.kpiDefinition.title}`)
        console.log(`      From: ${a.kpiDefinition.user.email}`)
        console.log(`      KPI Status: ${a.kpiDefinition.status}`)
        console.log(`      Level: ${a.level}`)
      })
    })

    // 5. Line Managers specifically
    console.log('\n5️⃣ LINE MANAGERS IN SYSTEM:')
    const lineManagers = users.filter(u => u.role === 'LINE_MANAGER')
    console.log(`Total LINE_MANAGER users: ${lineManagers.length}`)
    lineManagers.forEach(lm => {
      const pendingForThisManager = pendingApprovals.filter(a => a.approverId === lm.id)
      console.log(`  - ${lm.email} (${lm.name})`)
      console.log(`    ID: ${lm.id}`)
      console.log(`    Pending approvals: ${pendingForThisManager.length}`)
    })

    // 6. Check if Line Manager can see their approvals
    console.log('\n6️⃣ VERIFICATION: Can Line Managers see their approvals?')
    for (const lm of lineManagers) {
      const approvalsForLM = await prisma.approval.findMany({
        where: {
          approverId: lm.id,
          status: 'PENDING'
        }
      })
      console.log(`  ${lm.email}: ${approvalsForLM.length} pending approvals`)
      console.log(`    Approval IDs: ${approvalsForLM.map(a => a.id).join(', ') || 'NONE'}`)
    }

  } catch (error) {
    console.error('Error during diagnostics:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseApprovals()
