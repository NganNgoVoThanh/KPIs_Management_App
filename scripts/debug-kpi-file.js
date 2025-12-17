// Quick debug script for KPI file parsing
const XLSX = require('xlsx');

const filePath = 'download/2025 KPI Setting_Nguyen Thi Minh Tram_1203.1.xls';

try {
  console.log('\n=== DEBUG: KPI File Parsing ===\n');

  const workbook = XLSX.readFile(filePath);
  console.log('📚 All sheets:', workbook.SheetNames);

  // Find KPI sheet
  const kpiSheetNames = workbook.SheetNames.filter(name =>
    name.toLowerCase().includes('kpi') ||
    name.toLowerCase().includes('target') ||
    name.toLowerCase().includes('setting') ||
    name.toLowerCase().includes('example')
  );

  const sheetName = kpiSheetNames[0] || workbook.SheetNames[0];
  console.log(`🎯 Using sheet: "${sheetName}"\n`);

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false
  });

  console.log(`Total rows: ${data.length}\n`);

  // Check for "2025 TARGETS SETTING"
  for (let i = 0; i < Math.min(40, data.length); i++) {
    const row = data[i];
    const rowText = row.join('|').toLowerCase();

    if (rowText.includes('targets setting') || rowText.includes('target setting')) {
      console.log(`\n🎯 Found "TARGETS SETTING" at row ${i}`);
      console.log(`Row ${i}:`, row.slice(0, 10));

      // Check next row
      if (data[i + 1]) {
        const nextRow = data[i + 1];
        console.log(`\nRow ${i + 1} (next):`, nextRow.slice(0, 10));

        const hasMainKPI = nextRow.some(c => c?.toString().toLowerCase().includes('main kpi'));
        const hasSubKPI = nextRow.some(c => c?.toString().toLowerCase().includes('sub-kpi'));
        const hasTargetOrKPI = nextRow.some(c => c?.toString().toLowerCase().includes('target or kpi'));

        console.log('\nNext row has headers?', { hasMainKPI, hasSubKPI, hasTargetOrKPI });

        if (hasMainKPI || hasSubKPI || hasTargetOrKPI) {
          console.log('\n✅ Using row', i + 1, 'as header');

          // Find column indices
          const headerRow = nextRow;
          const findColIdx = (keywords) => {
            return headerRow.findIndex(c => {
              const s = c?.toString().toLowerCase().trim() || '';
              return keywords.some(k => s.includes(k));
            });
          };

          const mainKPIIdx = findColIdx(['main kpi']);
          const subKPIIdx = findColIdx(['sub-kpi', 'sub kpi']);
          const targetOrKPIIdx = findColIdx(['target or kpi', 'target/kpi']);
          const nameIdx = findColIdx(['name of kpi']);
          const typeIdx = findColIdx(['kpi type']);
          const unitIdx = findColIdx(['unit']);
          const weightIdx = findColIdx(['weight']);

          console.log('\n📍 Column Indices:', {
            mainKPIIdx,
            subKPIIdx,
            targetOrKPIIdx,
            nameIdx,
            typeIdx,
            unitIdx,
            weightIdx
          });

          // Extract KPIs
          console.log('\n📋 Extracting KPIs from rows', i + 2, 'onwards...\n');

          let validKPIs = 0;
          for (let j = i + 2; j < Math.min(i + 20, data.length); j++) {
            const dataRow = data[j];
            if (!dataRow || dataRow.every(c => !c || c.toString().trim() === '')) continue;

            // Try to get KPI name
            let kpiName = '';
            if (targetOrKPIIdx !== -1) {
              kpiName = dataRow[targetOrKPIIdx]?.toString().trim() || '';
            } else if (nameIdx !== -1) {
              kpiName = dataRow[nameIdx]?.toString().trim() || '';
            } else if (subKPIIdx !== -1) {
              kpiName = dataRow[subKPIIdx]?.toString().trim() || '';
            }

            const kpiType = typeIdx !== -1 ? dataRow[typeIdx]?.toString().trim() : '';
            const unit = unitIdx !== -1 ? dataRow[unitIdx]?.toString().trim() : '';

            const filledCells = dataRow.filter(c => c && c.toString().trim().length > 0).length;

            console.log(`Row ${j}: [${filledCells} cells]`);
            console.log(`  KPI Name: "${kpiName}"`);
            console.log(`  Type: "${kpiType}"`);
            console.log(`  Unit: "${unit}"`);

            if (kpiName && kpiName.length >= 2 && filledCells > 2) {
              console.log(`  ✅ VALID KPI`);
              validKPIs++;
            } else {
              console.log(`  ❌ SKIPPED (name too short or not enough data)`);
            }
            console.log('');
          }

          console.log(`\n✅ Total valid KPIs found: ${validKPIs}\n`);
        } else {
          console.log('\n⚠️ Next row does NOT have headers, using row', i, 'as header');
        }
      }
      break;
    }
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
