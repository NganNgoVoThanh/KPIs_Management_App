
const mysqldump = require('mysqldump');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// TiDB Config (Source)
const SOURCE_CONFIG = {
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '36ZBaPjQ2KHkNvy.root',
    password: 'A76iDK1uW6DcXDPk',
    database: 'test',
    ssl: {
        rejectUnauthorized: true
    }
};

// MySQL Config (Target) - Parse from DATABASE_URL
// URL: mysql://user:pass@host:port/dbname
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ DATABASE_URL is missing!");
    process.exit(1);
}

// Simple parser for connection string
const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!urlMatch) {
    console.error("❌ Invalid DATABASE_URL format.");
    process.exit(1);
}

const TARGET_CONFIG = {
    user: urlMatch[1],
    password: urlMatch[2],
    host: urlMatch[3],
    port: parseInt(urlMatch[4]),
    database: urlMatch[5],
    multipleStatements: true // Important for restoring dump
};

async function main() {
    const dumpFile = path.resolve(__dirname, 'temp_migration.sql');

    console.log("🚀 START MIGRATION: TiDB -> MySQL Local");
    console.log(`   Source: ${SOURCE_CONFIG.host}`);
    console.log(`   Target: ${TARGET_CONFIG.host}`);

    try {
        // 1. Dump from TiDB
        console.log("\n📦 Dumping data from TiDB...");
        await mysqldump({
            connection: SOURCE_CONFIG,
            dumpToFile: dumpFile,
            dump: {
                data: {
                    verbose: false,
                    format: false // SQL format
                },
                schema: false, // We already used Prisma db push for schema! We only need DATA.
                trigger: false,
            }
        });
        console.log("✅ Dump success!");

        // 2. Read Dump File
        // The mysqldump lib creates a file with INSERT statements.
        // However, we need to be careful about table cleaning. 
        // Prisma db push already created tables.

        // Let's modify the dump or just truncate tables before import.
        // Or re-dump with 'schema: false' (data only).
        // I set schema: false above explicitly only for Data.

        let sqlContent = fs.readFileSync(dumpFile, 'utf8');

        // 3. Import to Target
        console.log("\n📥 Importing to MySQL...");
        const connection = await mysql.createConnection(TARGET_CONFIG);

        // Disable FK checks to allow truncation and random insert order
        await connection.query('SET FOREIGN_KEY_CHECKS=0;');

        // Truncate tables first (Clean start)
        // We get table list from our hardcoded knowledge or just let user confirm in Step 123 (reset).
        // Actually, since we set data-loss allowed before, tables SHOULD be empty.
        // But to be safe, we can run TRUNCATE on known tables.
        const tables = [
            'users', 'org_units', 'cycles', 'kpi_templates', 'kpi_definitions',
            'kpi_actuals', 'approvals', 'change_requests', 'approval_hierarchies',
            'evidences', 'company_documents', 'kpi_library_uploads', 'kpi_library_entries',
            'kpi_resources', 'proxy_actions', 'notifications', 'historical_kpi_data',
            'audit_logs', 'system_configs'
        ];

        for (const table of tables) {
            try {
                await connection.query(`TRUNCATE TABLE \`${table}\``);
            } catch (e) { /* ignore if not exist */ }
        }

        // Execute huge SQL script
        // Note: query() might fail on huge files. 
        // But standard mysqldump output valid SQL. 
        // We might need to split by line or statement if too big.
        // For now, assuming reasonable size.
        await connection.query(sqlContent);

        await connection.query('SET FOREIGN_KEY_CHECKS=1;');
        await connection.end();

        console.log("✅ Import success!");

        // Cleanup
        fs.unlinkSync(dumpFile);
        console.log("🧹 Cleanup done.");

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    }
}

main();
