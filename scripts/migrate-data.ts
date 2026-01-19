
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

// Cấu hình kết nối
const OLD_DB_URL = "mysql://36ZBaPjQ2KHkNvy.root:A76iDK1uW6DcXDPk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl-mode=REQUIRED";
const NEW_DB_URL = process.env.DATABASE_URL;

if (!NEW_DB_URL) {
    console.error("❌ Lỗi: Không tìm thấy DATABASE_URL trong môi trường.");
    process.exit(1);
}

console.log("Source DB:", OLD_DB_URL.replace(/:[^:@]*@/, ":***@"));
console.log("Target DB:", NEW_DB_URL.replace(/:[^:@]*@/, ":***@"));

const sourceClient = new PrismaClient({
    datasources: { db: { url: OLD_DB_URL } }
});

const targetClient = new PrismaClient({
    datasources: { db: { url: NEW_DB_URL } }
});

async function main() {
    console.log("🚀 Bắt đầu quá trình chuyển đổi dữ liệu...");

    // 1. Kết nối Source
    try {
        console.log("🔌 Đang kết nối Source DB (TiDB)...");
        await sourceClient.$connect();
        console.log("✅ Kết nối Source DB thành công.");
    } catch (e) {
        console.error("❌ Lỗi kết nối Source DB:", e);
        throw e;
    }

    // 2. Kết nối Target
    try {
        console.log("🔌 Đang kết nối Target DB (MySQL)...");
        await targetClient.$connect();
        console.log("✅ Kết nối Target DB thành công.");
    } catch (e) {
        console.error("❌ Lỗi kết nối Target DB:", e);
        throw e;
    }

    // 3. Tắt kiểm tra khóa ngoại
    await targetClient.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0;");

    // 3. Danh sách các Model cần migrate (Thứ tự không quan trọng vì đã tắt FK checks, nhưng nên giữ logic)
    // Lưu ý: Tên property trong prisma client thường là camelCase của tên model
    const models = [
        'user',
        'orgUnit',
        'cycle',
        'kpiTemplate',
        'kpiDefinition',
        'kpiActual',
        'approval',
        'changeRequest',
        'approvalHierarchy',
        'evidence',
        'companyDocument',
        'kpiLibraryUpload',
        'kpiLibraryEntry',
        'kpiResource',
        'proxyAction',
        'notification',
        'historicalKpiData',
        'auditLog',
        'systemConfig'
    ];

    // 4. Xóa dữ liệu cũ ở đích (nếu có) để tránh duplicate
    console.log("\n🧹 Đang làm sạch database đích...");
    for (const model of models) {
        try {
            // @ts-ignore
            await targetClient[model].deleteMany({});
            console.log(`   - Đã xóa dữ liệu bảng: ${model}`);
        } catch (e) {
            console.warn(`   ⚠️ Cảnh báo khi xóa ${model}: ${(e as Error).message}`);
        }
    }

    // 5. Chép dữ liệu từ Nguồn -> Đích
    console.log("\n📦 Đang chuyển dữ liệu...");

    for (const model of models) {
        try {
            // @ts-ignore
            const data = await sourceClient[model].findMany();
            if (data.length > 0) {
                // @ts-ignore
                await targetClient[model].createMany({
                    data: data,
                    skipDuplicates: true // Bỏ qua nếu trùng lặp (dù đã xóa hết nhưng an toàn hơn)
                });
                console.log(`   ✅ Đã chuyển ${data.length} bản ghi cho bảng: ${model}`);
            } else {
                console.log(`   ℹ️  Bảng ${model} trống, bỏ qua.`);
            }
        } catch (e) {
            console.error(`   ❌ LỖI khi chuyển bảng ${model}:`, (e as Error).message);
            // Không throw để tiếp tục các bảng khác
        }
    }

    // 6. Bật lại kiểm tra khóa ngoại
    await targetClient.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1;");
    console.log("\n✅ Hoàn tất chuyển đổi dữ liệu.");
}

main()
    .catch((e) => {
        console.error("\n❌ Lỗi Critical Full Detail:", JSON.stringify(e, null, 2));
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await sourceClient.$disconnect();
        await targetClient.$disconnect();
    });
