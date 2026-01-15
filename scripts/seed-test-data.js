
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAndSeed() {
    console.log('🔄 STARTING DATA RESET & SEEDING for Testing...');

    try {
        // 1. DELETE OLD DATA (Clean Slate)
        console.log('🗑️ Deleting old data...');

        // Helper to safely delete
        const safeDelete = async (modelName) => {
            try {
                if (prisma[modelName]) {
                    await prisma[modelName].deleteMany();
                    console.log(`   - Deleted ${modelName}`);
                }
            } catch (e) {
                console.log(`   ! Note: Could not delete ${modelName} (Detail: ${e.message.split('\n')[0]})`);
            }
        };

        // Transactional Data
        await safeDelete('proxyAction');
        await safeDelete('notification');
        await safeDelete('approval');
        await safeDelete('changeRequest');
        await safeDelete('evidence');
        await safeDelete('kpiActual');
        await safeDelete('kpiDefinition');
        await safeDelete('kpiTemplate');
        await safeDelete('kpiLibraryEntry');
        await safeDelete('kpiLibraryUpload');
        await safeDelete('kpiResource');
        await safeDelete('historicalKpiData');
        await safeDelete('cycle');

        console.log('🗑️ Deleting Users & OrgUnits...');
        // Break manager links first to be safe
        try {
            await prisma.user.updateMany({ data: { managerId: null } });
        } catch (e) {
            console.log('   ! Note: could not unlink managers (might be empty)');
        }

        // Delete OrgUnits (Cascade should handle Users, but we'll try deleting users first just in case)
        await safeDelete('user');
        await safeDelete('orgUnit');

        console.log('✅ Old data cleared.');

        // 1.5 CREATE ORG UNIT
        console.log('🏢 Creating Marketing Department OrgUnit...');
        const marketingOrg = await prisma.orgUnit.create({
            data: {
                name: 'Marketing Department',
                type: 'DEPARTMENT'
            }
        });
        const itOrg = await prisma.orgUnit.create({
            data: {
                name: 'IT Department',
                type: 'DEPARTMENT'
            }
        });

        // 2. DEFINE TEST USERS
        const users = [
            {
                email: 'staff@intersnack.com.vn',
                name: 'Ngan Ngo (Staff)',
                role: 'STAFF',
                department: 'MARKETING',
                orgUnitId: marketingOrg.id
            },
            {
                email: 'linemanager@intersnack.com.vn',
                name: 'Line Manager Marketing',
                role: 'LINE_MANAGER',
                department: 'MARKETING',
                orgUnitId: marketingOrg.id
            },
            {
                email: 'hod@intersnack.com.vn',
                name: 'Head of Department',
                role: 'MANAGER',
                department: 'MARKETING',
                orgUnitId: marketingOrg.id
            },
            {
                email: 'admin@intersnack.com.vn',
                name: 'System Admin',
                role: 'ADMIN',
                department: 'IT',
                orgUnitId: itOrg.id
            }
        ];

        // 3. CREATE/UPDATE USERS
        console.log('bust creating users...');

        // Store user IDs for linking relationships
        const userMap = {};

        for (const u of users) {
            const user = await prisma.user.upsert({
                where: { email: u.email },
                update: {
                    role: u.role,
                    department: u.department,
                    orgUnitId: u.orgUnitId,
                    status: 'ACTIVE', // ensure active
                    name: u.name
                },
                create: {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    department: u.department,
                    status: 'ACTIVE',
                    orgUnitId: u.orgUnitId
                }
            });
            userMap[u.role] = user;
            console.log(`   + Upserted User: ${u.email} (${u.role})`);
        }

        // 4. LINK MANAGERS (Staff -> Line Manager)
        // This is crucial for Level 1 lookup
        if (userMap['STAFF'] && userMap['LINE_MANAGER']) {
            await prisma.user.update({
                where: { id: userMap['STAFF'].id },
                data: { managerId: userMap['LINE_MANAGER'].id }
            });
            console.log('🔗 Linked Staff -> Line Manager');
        }

        console.log('\n✅ SEEDING COMPLETE. Ready for Testing!');
        console.log('----------------------------------------------------');
        console.log('ACCOUNT INFO FOR SSO LOGIN:');
        console.log('1. STAFF:        staff@intersnack.com.vn');
        console.log('2. LINE MANAGER: linemanager@intersnack.com.vn');
        console.log('3. HOD:          hod@intersnack.com.vn');
        console.log('4. ADMIN:        admin@intersnack.com.vn');
        console.log('----------------------------------------------------');

    } catch (error) {
        console.error('❌ SEEDING FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAndSeed();
