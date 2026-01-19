import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const sourceDbUrl = "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict"
const targetDbUrl = process.env.DATABASE_URL

if (!targetDbUrl) {
    console.error("❌ Target DATABASE_URL is missing in .env")
    process.exit(1)
}

const sourcePrisma = new PrismaClient({
    datasources: { db: { url: sourceDbUrl } },
})

const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetDbUrl } },
})

async function migrateData() {
    console.log("🚀 Starting migration from TiDB -> MySQL...")

    try {
        // 1. Migrate OrgUnits FIRST (to satisfy foreign keys)
        console.log("Migrating OrgUnits...")
        const orgUnits = await sourcePrisma.$queryRaw`SELECT * FROM org_units` as any[]
        for (const org of orgUnits) {
            const exists = await targetPrisma.orgUnit.findUnique({ where: { id: org.id } })
            if (!exists) {
                await targetPrisma.orgUnit.create({
                    data: {
                        id: org.id,
                        name: org.name,
                        parentId: org.parentId,
                        type: org.type,
                        managerId: org.managerId, // Note: This might fail if manager doesn't exist yet! Circular dependency.
                        // Strategy: Insert OrgUnit with managerId = NULL first, then update later or handle circular dependency.
                        // For simplicity, let's try inserting with managerId as is, BUT if it fails, we retry with null.
                        createdAt: org.createdAt || new Date(),
                        updatedAt: new Date(),
                    }
                }).catch(async (e) => {
                    // If failed likely due to managerId FK, retry with null managerId
                    console.warn(`Retry OrgUnit ${org.name} without managerId...`)
                    await targetPrisma.orgUnit.create({
                        data: {
                            id: org.id,
                            name: org.name,
                            parentId: org.parentId,
                            type: org.type,
                            managerId: null,
                            createdAt: org.createdAt || new Date(),
                            updatedAt: new Date(),
                        }
                    })
                })
            }
        }
        console.log("✅ OrgUnits migrated.")

        // 2. Migrate Users
        console.log("Migrating Users...")
        const users = await sourcePrisma.$queryRaw`SELECT * FROM users` as any[]
        console.log(`Found ${users.length} users in Source.`)

        for (const user of users) {
            // Check if exists
            const exists = await targetPrisma.user.findUnique({ where: { email: user.email } })
            if (!exists) {
                // Map fields explicitly to handle schema differences
                await targetPrisma.user.create({
                    data: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        orgUnitId: user.orgUnitId || null,
                        department: user.department,
                        employeeId: user.employeeId,
                        managerId: user.managerId, // Might fail if manager not migrated yet. Self-referencing FKs are tricky.
                        // Strategy: Create user with managerId=null first.
                        status: user.status || 'ACTIVE',
                        locale: user.locale || 'vi-VN',
                        createdAt: user.createdAt || new Date(),
                        updatedAt: new Date(),
                    }
                }).catch(async (e) => {
                    // If failed, try without managerId
                    console.warn(`Retry User ${user.email} without managerId/orgUnitId...`)
                    await targetPrisma.user.create({
                        data: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            orgUnitId: null, // Safe fallback
                            department: user.department,
                            employeeId: user.employeeId, // Assuming unique constraint holds or is managed
                            managerId: null,
                            status: user.status || 'ACTIVE',
                            locale: user.locale || 'vi-VN',
                            createdAt: user.createdAt || new Date(),
                            updatedAt: new Date(),
                        }
                    })
                })
            } else {
                console.log(`Skipping existing user: ${user.email}`)
            }
        }
        console.log("✅ Users migrated.")

        // 2.5 Update Users Managers & OrgUnits (Second pass to fix relationships)
        console.log("Updating User relationships...")
        for (const user of users) {
            if (user.managerId || user.orgUnitId) {
                await targetPrisma.user.update({
                    where: { id: user.id },
                    data: {
                        managerId: user.managerId,
                        orgUnitId: user.orgUnitId
                    }
                }).catch(e => console.warn(`Failed to link manager/org for ${user.email}: ${e.message}`))
            }
        }

        // 2.6 Update OrgUnit Managers (Second pass)
        console.log("Updating OrgUnit Managers...")
        for (const org of orgUnits) {
            if (org.managerId) {
                await targetPrisma.orgUnit.update({
                    where: { id: org.id },
                    data: { managerId: org.managerId }
                }).catch(e => console.warn(`Failed to link manager for Org ${org.name}: ${e.message}`))
            }
        }


        /*
        // 3. Migrate Cycles
        console.log("Migrating Cycles...")
        // Get a fallback user (e.g. system admin or first user found)
        const fallbackUser = await targetPrisma.user.findFirst();
        if (!fallbackUser) {
            console.warn("⚠️ No users found in target DB! Cannot migrate cycles safely.");
        }

        const cycles = await sourcePrisma.$queryRaw`SELECT * FROM cycles` as any[]
        for (const cycle of cycles) {
            const exists = await targetPrisma.cycle.findUnique({ where: { id: cycle.id } })

            // Verify if creator exists in target
            let creatorId = cycle.createdBy;
            const creatorExists = await targetPrisma.user.findUnique({ where: { id: creatorId } });
            if (!creatorExists) {
                console.warn(`⚠️ Cycle ${cycle.id} creator ${creatorId} not found. Using fallback user.`);
                if (fallbackUser) {
                    creatorId = fallbackUser.id;
                } else {
                    console.error(`❌ Cannot migrate cycle ${cycle.id} - No creator and no fallback user.`);
                    continue;
                }
            }

            if (!exists) {
                await targetPrisma.cycle.create({
                    data: {
                        id: cycle.id,
                        name: cycle.name,
                        type: cycle.type,
                        periodStart: cycle.periodStart,
                        periodEnd: cycle.periodEnd,
                        status: cycle.status,
                        createdBy: creatorId, // Use verified or fallback ID
                        targetUsers: cycle.targetUsers,
                        settings: cycle.settings
                    }
                }).catch(e => console.error(`❌ Failed to migrate cycle ${cycle.id}: ${e.message}`))
            }
        }
        console.log("✅ Cycles migrated.")

        // 4. Migrate KPI Definitions
        console.log("Migrating KPI Definitions...")
        const kpis = await sourcePrisma.$queryRaw`SELECT * FROM kpi_definitions` as any[]
        for (const kpi of kpis) {
            const exists = await targetPrisma.kpiDefinition.findUnique({ where: { id: kpi.id } })

            // Verify user existence
            let userId = kpi.userId;
            const userExists = await targetPrisma.user.findUnique({ where: { id: userId } });
            if (!userExists) {
                if (fallbackUser) userId = fallbackUser.id;
                else continue; // Skip if no user and no fallback
            }

            // Check Owner ID as well if it's different
            let ownerId = kpi.ownerId;
            const ownerExists = await targetPrisma.user.findUnique({ where: { id: ownerId } });
            if (!ownerExists) {
                if (fallbackUser) ownerId = fallbackUser.id;
                else ownerId = userId; // Fallback to the (now valid) userId
            }

            if (!exists) {
                await targetPrisma.kpiDefinition.create({
                    data: {
                        id: kpi.id,
                        cycleId: kpi.cycleId,
                        userId: userId, // Use verified ID
                        orgUnitId: kpi.orgUnitId, // Assuming OrgUnit exists (we migrated them first), but could also fail
                        title: kpi.title,
                        description: kpi.description,
                        type: kpi.type,
                        unit: kpi.unit,
                        target: kpi.target,
                        formula: kpi.formula,
                        weight: kpi.weight,
                        dataSource: kpi.dataSource,
                        ownerId: ownerId, // Use verified ID
                        status: kpi.status,
                        frequency: kpi.frequency,
                        priority: kpi.priority,
                        // Add other fields as matched in schema
                    }
                }).catch(e => console.error(`❌ Failed kpi ${kpi.id}: ${e.message}`))
            }
        }
        console.log("✅ KPI Definitions migrated.")
        */
        console.log("⚠️ Skipped Cycles & KPIs migration as requested. Only Users & OrgUnits migrated.")


        // 5. Migrate KPI Actuals (if any)
        // ... similar pattern

        console.log("🎉 Migration COMPLETED successfully!")

    } catch (error) {
        console.error("❌ Migration failed:", error)
    } finally {
        await sourcePrisma.$disconnect()
        await targetPrisma.$disconnect()
    }
}

migrateData()
