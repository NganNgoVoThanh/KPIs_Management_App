
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanData() {
    console.log('🧹 Cleaning KPI Data (Preserving Users & Library)...');
    try {
        // Delete Transactional Data (Order matters)
        await prisma.approval.deleteMany();
        console.log('- Approvals deleted');

        await prisma.notification.deleteMany();
        console.log('- Notifications deleted');

        await prisma.changeRequest.deleteMany();
        console.log('- ChangeRequests deleted');

        await prisma.evidence.deleteMany();
        console.log('- Evidences deleted');

        await prisma.kpiActual.deleteMany();
        console.log('- KpiActuals deleted');

        // Delete User KPIs (Assigned instances)
        await prisma.kpiDefinition.deleteMany();
        console.log('- User KpiDefinitions deleted');

        // Note: We KEEP 'kpiLibraryEntry', 'users', 'orgUnit', 'cycle'

        console.log('✅ CLEANUP COMPLETE.');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanData();
