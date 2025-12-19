/**
 * Full Parsing Test for Both Templates
 * This script tests the complete data extraction logic including KPI data rows
 */

const XLSX = require('xlsx');
const path = require('path');

function parseDepartmentTemplate(sanitizedData, deptHeaderIdx) {
  const normalizedData = [];
  for (let i = 0; i < 6; i++) normalizedData.push([]); // Add 6 dummy rows

  const headerRow = sanitizedData[deptHeaderIdx];

  const findColIdx = (keywords) => {
    return headerRow.findIndex(c => {
      const val = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return keywords.some(k => val.includes(k));
    });
  };

  const idxSTT = findColIdx(['stt']);
  const idxOGSM = findColIdx(['ogsm', 'mục tiêu công ty', 'mục tiêu']);
  const idxDept = findColIdx(['phòng ban', 'department']);
  const idxJob = findColIdx(['vị trí', 'job title', 'vi tri']);
  const idxName = findColIdx(['tên kpi', 'name of kpi', 'ten kpi']);
  const idxType = findColIdx(['loại kpi', 'kpi type', 'loai kpi']);
  const idxUnit = findColIdx(['đơn vị tính', 'unit', 'don vi tinh']);
  const idxEvidence = findColIdx(['đơn vị cung cấp', 'evidence', 'don vi cung cap']);

  console.log('   Column Indices:', {
    idxSTT, idxOGSM, idxDept, idxJob, idxName, idxType, idxUnit, idxEvidence
  });

  let stt = 1;
  for (let i = deptHeaderIdx + 2; i < sanitizedData.length; i++) {
    const row = sanitizedData[i];
    if (!Array.isArray(row)) continue;

    if (row.every(c => !c || c.toString().trim() === '')) continue;

    const firstCell = row[0]?.toString().trim().toUpperCase();
    if (firstCell === 'TỔNG' || firstCell === 'ĐỀ XUẤT' || firstCell === 'RÀ SOÁT') break;

    const kpiName = idxName !== -1 ? row[idxName]?.toString().trim() : '';

    if (!kpiName || kpiName.length < 5) continue;

    const dept = idxDept !== -1 ? row[idxDept]?.toString().trim() : '';
    const kpiType = idxType !== -1 ? row[idxType]?.toString().trim() : '';

    if (!dept || !kpiType) continue;

    normalizedData.push([
      stt++,
      idxOGSM !== -1 ? row[idxOGSM]?.toString().trim() : '',
      dept,
      idxJob !== -1 ? row[idxJob]?.toString().trim() : '',
      kpiName,
      kpiType,
      idxUnit !== -1 ? row[idxUnit]?.toString().trim() : '',
      '',
      '',
      '',
      idxEvidence !== -1 ? row[idxEvidence]?.toString().trim() : ''
    ]);
  }

  return normalizedData;
}

function parseTargetsSettingTemplate(sanitizedData, targetsHeaderIdx) {
  const transformedData = [];
  for (let i = 0; i < 6; i++) transformedData.push([]);

  // Extract metadata
  let extractedDept = '';
  let extractedJobTitle = '';

  for (let i = 0; i < Math.min(10, sanitizedData.length); i++) {
    const row = sanitizedData[i];
    if (!Array.isArray(row)) continue;

    // Find "Department:" and get the value in the next non-empty cell
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString().trim() || '';
      if (cell.toLowerCase() === 'department:' && j + 1 < row.length) {
        const nextValue = row[j + 1]?.toString().trim();
        if (nextValue && !nextValue.endsWith(':')) {
          extractedDept = nextValue;
          break;
        }
      }
    }

    // Find "Job Tittle:" or "Job Title:" and get the value
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString().trim() || '';
      if ((cell.toLowerCase() === 'job tittle:' || cell.toLowerCase() === 'job title:') && j + 1 < row.length) {
        const nextValue = row[j + 1]?.toString().trim();
        if (nextValue && !nextValue.endsWith(':')) {
          extractedJobTitle = nextValue;
          break;
        }
      }
    }
  }

  console.log('   Extracted Metadata:', { extractedDept, extractedJobTitle });

  const headerRow = sanitizedData[targetsHeaderIdx];

  const findColIdx = (keywords) => {
    return headerRow.findIndex(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return keywords.some(k => s.includes(k));
    });
  };

  const kpiGroupIdx = findColIdx(['kpi group', 'ogsm']);
  const kpiNameIdx = findColIdx(['kpi name']);
  const targetIdx = findColIdx(['target']);
  const unitIdx = findColIdx(['unit']);
  const weightIdx = findColIdx(['weight']);
  const kpiTypeIdx = findColIdx(['kpi type']);

  console.log('   Column Indices:', {
    kpiGroupIdx, kpiNameIdx, targetIdx, unitIdx, weightIdx, kpiTypeIdx
  });

  for (let i = targetsHeaderIdx + 1; i < sanitizedData.length; i++) {
    const row = sanitizedData[i];
    if (!Array.isArray(row)) continue;

    if (row.every(c => !c || c.toString().trim() === '')) continue;

    const kpiGroup = kpiGroupIdx !== -1 ? row[kpiGroupIdx]?.toString().trim() : '';
    const kpiName = kpiNameIdx !== -1 ? row[kpiNameIdx]?.toString().trim() : '';

    const kpiNameLower = kpiName.toLowerCase();
    if (
      kpiNameLower.includes('business objective') ||
      kpiNameLower.includes('individual development') ||
      kpiNameLower.includes('core value') ||
      kpiNameLower.includes('management criteria') ||
      kpiName.length < 10
    ) continue;

    if (kpiGroup.toLowerCase().includes('business objective') ||
        kpiGroup.toLowerCase().includes('individual development') ||
        kpiGroup.toLowerCase().includes('core value')) {
      continue;
    }

    const kpiType = kpiTypeIdx !== -1 ? row[kpiTypeIdx]?.toString().trim() : '';

    if (kpiName && kpiGroup && kpiType && /^(IV|III|II|I|[1-4])$/i.test(kpiType)) {
      transformedData.push([
        transformedData.length - 5,
        kpiGroup,
        extractedDept,
        extractedJobTitle,
        kpiName,
        kpiType,
        row[unitIdx]?.toString().trim() || '',
        row[targetIdx]?.toString().trim() || '',
        row[weightIdx]?.toString().trim() || '',
        '',
        ''
      ]);
    }
  }

  return transformedData;
}

async function testFullParsing() {
  console.log('='.repeat(80));
  console.log('📊 Full Parsing Test for Both Templates');
  console.log('='.repeat(80));

  const files = [
    {
      name: 'Department KPI Template',
      path: path.join(__dirname, '../download/Copy of Thu vien KPI_Template.xlsx'),
      templateType: 'Department KPI Template',
      expectedHeaderRow: 4,
      expectedKPICount: 2
    },
    {
      name: 'Personal KPI Template (2025 Targets Setting)',
      path: path.join(__dirname, '../download/2025 KPI Setting Template_System.xls'),
      templateType: '2025 Targets Setting Template',
      expectedHeaderRow: 11,
      expectedKPICount: 7
    }
  ];

  for (const file of files) {
    console.log('\n' + '-'.repeat(80));
    console.log(`📄 Testing: ${file.name}`);
    console.log('-'.repeat(80));

    try {
      const workbook = XLSX.readFile(file.path, { cellStyles: true, cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      const sanitizedData = rawData.map(row =>
        row.map(cell => (cell instanceof Date ? cell.toISOString() : cell))
      );

      console.log(`📏 Total rows: ${sanitizedData.length}`);

      let parsedData;
      if (file.templateType === 'Department KPI Template') {
        parsedData = parseDepartmentTemplate(sanitizedData, file.expectedHeaderRow);
      } else {
        parsedData = parseTargetsSettingTemplate(sanitizedData, file.expectedHeaderRow);
      }

      const kpiCount = parsedData.length - 6; // Subtract dummy rows
      console.log(`\n✅ Extracted ${kpiCount} KPI entries`);
      console.log(`   Expected: ${file.expectedKPICount} KPIs`);

      if (kpiCount > 0) {
        console.log('\n📋 Sample KPI Data (first 3):');
        parsedData.slice(6, 9).forEach((row, idx) => {
          console.log(`\n   KPI ${idx + 1}:`);
          console.log(`      STT: ${row[0]}`);
          console.log(`      OGSM: ${row[1]}`);
          console.log(`      Department: ${row[2]}`);
          console.log(`      Job Title: ${row[3]}`);
          console.log(`      KPI Name: ${row[4]}`);
          console.log(`      KPI Type: ${row[5]}`);
          console.log(`      Unit: ${row[6]}`);
          console.log(`      Target: ${row[7]}`);
          console.log(`      Weight: ${row[8]}`);
        });
      }

      if (kpiCount === file.expectedKPICount) {
        console.log(`\n   ✅ PASS - KPI count matches expected!`);
      } else {
        console.log(`\n   ⚠️  WARNING - Expected ${file.expectedKPICount} KPIs, got ${kpiCount}`);
      }

    } catch (error) {
      console.error(`❌ Error testing ${file.name}:`, error.message);
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Full Parsing Test Complete');
  console.log('='.repeat(80));
}

testFullParsing();
