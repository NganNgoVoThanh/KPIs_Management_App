// scripts/reimport-templates.js
// Script to re-import templates with updated descriptions

const fs = require('fs');
const path = require('path');

async function reimportTemplates() {
  console.log('🔄 Starting template re-import...\n');

  // 1. Find the upload ID
  const uploadsDir = path.join(__dirname, '../.local-storage/kpiLibraryUploads');
  const uploadFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.json'));

  if (uploadFiles.length === 0) {
    console.log('❌ No uploads found');
    return;
  }

  console.log(`📁 Found ${uploadFiles.length} upload(s):\n`);

  for (const file of uploadFiles) {
    const uploadPath = path.join(uploadsDir, file);
    const upload = JSON.parse(fs.readFileSync(uploadPath, 'utf-8'));
    const uploadId = file.replace('.json', '');

    console.log(`Upload ID: ${uploadId}`);
    console.log(`File Name: ${upload.fileName}`);
    console.log(`Status: ${upload.status}`);
    console.log(`Total Entries: ${upload.totalEntries}`);
    console.log(`Valid Entries: ${upload.validEntries}`);
    console.log(`Processed Count: ${upload.processedCount || 0}\n`);

    if (upload.status === 'APPROVED') {
      console.log(`✅ Re-importing templates from: ${upload.fileName}\n`);
      await reimportFromUpload(uploadId, upload);
    }
  }
}

async function reimportFromUpload(uploadId, upload) {
  // Simulate the backend logic locally
  const rawData = upload.rawData || [];
  const dataRows = rawData.slice(6); // Skip header rows

  console.log(`📝 Processing ${dataRows.length} rows...\n`);

  // Find and archive old templates
  const templatesDir = path.join(__dirname, '../.local-storage/kpiTemplates');
  if (fs.existsSync(templatesDir)) {
    const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    let archivedCount = 0;

    for (const file of templateFiles) {
      const templatePath = path.join(templatesDir, file);
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      if (template.uploadId === uploadId && template.isActive !== false) {
        console.log(`🗑️  Archiving: ${template.name || template.kpiName}`);
        template.isActive = false;
        template.archivedAt = new Date().toISOString();
        fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
        archivedCount++;
      }
    }

    console.log(`\n✅ Archived ${archivedCount} old template(s)\n`);
  }

  // Create new templates with updated descriptions
  let createdCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 7;
    const kpiName = row[4]?.toString().trim();
    const department = row[2]?.toString().trim();
    const kpiType = row[5]?.toString().trim();
    const jobTitle = row[3]?.toString().trim();

    if (kpiName && department) {
      const templateDescription = jobTitle
        ? `${kpiName} - ${jobTitle} (Row ${rowNumber} from ${upload.fileName})`
        : `${kpiName} - ${department} (Row ${rowNumber} from ${upload.fileName})`;

      const newTemplate = {
        id: require('crypto').randomUUID(),
        name: kpiName,
        kpiName: kpiName, // For backward compatibility
        description: templateDescription,
        department: department,
        jobTitle: jobTitle,
        category: mapKpiTypeToCategory(kpiType),
        kpiType: kpiType || 'Custom',
        unit: row[6]?.toString().trim(),
        formula: row[7]?.toString().trim(),
        dataSource: row[8]?.toString().trim(),
        targetValue: row[9] ? parseFloat(row[9].toString()) : undefined,
        weight: row[10] ? parseFloat(row[10].toString()) : undefined,
        source: 'EXCEL_IMPORT',
        uploadId: uploadId,
        status: 'APPROVED',
        isActive: true,
        createdBy: upload.uploadedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        usageCount: 0
      };

      const templatePath = path.join(templatesDir, `${newTemplate.id}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(newTemplate, null, 2));

      console.log(`✨ Created: ${templateDescription}`);
      createdCount++;
    }
  }

  console.log(`\n✅ Created ${createdCount} new template(s) with updated descriptions\n`);
  console.log('🎉 Re-import complete!\n');
}

function mapKpiTypeToCategory(type) {
  const map = {
    'I': 'FINANCIAL',
    'II': 'CUSTOMER',
    'III': 'OPERATIONAL',
    'IV': 'LEARNING'
  };
  return map[type] || 'OPERATIONAL';
}

reimportTemplates().catch(console.error);
