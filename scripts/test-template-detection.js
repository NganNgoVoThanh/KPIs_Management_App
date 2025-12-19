/**
 * Test Template Detection for Bulk Upload
 * This script simulates the Excel parsing logic to verify both template formats are detected correctly
 */

const XLSX = require('xlsx');
const path = require('path');

// Simulate template detection logic
function detectTemplate(sanitizedData) {
  let templateType = 'Unknown';
  let headerIdx = -1;

  // TEMPLATE 3: Department KPI Template (Thu vien KPI_Template.xlsx)
  for (let i = 0; i < Math.min(20, sanitizedData.length); i++) {
    const row = sanitizedData[i];
    if (!Array.isArray(row)) continue;

    const hasSTT = row.some(c => {
      const s = c?.toString().trim().toUpperCase() || '';
      return s === 'STT';
    });
    const hasOGSMCompany = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return s.includes('ogsm') && (s.includes('mục tiêu công ty') || s.includes('company'));
    });
    const hasDeptJobTitle = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return (s.includes('phòng ban') || s.includes('department')) &&
             (s.includes('vị trí') || s.includes('job title'));
    });
    const hasNameKPI = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return s.includes('tên kpi') && s.includes('name of kpi');
    });
    const hasKPITypeEvidence = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return (s.includes('loại kpi') || s.includes('kpi type')) ||
             (s.includes('đơn vị cung cấp') || s.includes('evidence'));
    });

    const deptMarkers = [hasSTT, hasOGSMCompany, hasDeptJobTitle, hasNameKPI, hasKPITypeEvidence];
    const deptMarkerCount = deptMarkers.filter(Boolean).length;

    if (deptMarkerCount >= 3) {
      headerIdx = i;
      templateType = 'Department KPI Template';
      console.log(`✅ Found Department KPI header at row ${i} with ${deptMarkerCount} markers`);
      return { templateType, headerIdx };
    }
  }

  // TEMPLATE 4: 2025 TARGETS SETTING
  let metadataEndIdx = -1;

  for (let i = 0; i < Math.min(15, sanitizedData.length); i++) {
    const row = sanitizedData[i];
    if (!Array.isArray(row)) continue;

    const rowText = row.map(c => c?.toString().toLowerCase().trim() || '').join(' ');

    if (rowText.includes('targets setting') || rowText.includes('target setting')) {
      metadataEndIdx = i;
      console.log(`📋 Found metadata marker at row ${i}`);
    }
  }

  for (let i = metadataEndIdx + 1; i < Math.min(30, sanitizedData.length); i++) {
    const row = sanitizedData[i];
    if (!Array.isArray(row)) continue;

    const hasKPIGroup = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return s.includes('kpi group') || (s.includes('kpi') && s.includes('ogsm'));
    });
    const hasKPIName = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return s.includes('kpi name');
    });
    const hasTarget = row.some(c => {
      const s = c?.toString().toLowerCase().trim() || '';
      return s === 'target' || s.includes('target ');
    });
    const hasUnit = row.some(c => {
      const s = c?.toString().toLowerCase().trim() || '';
      return s === 'unit';
    });
    const hasWeight = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return s.includes('weight') && s.includes('(a)');
    });
    const hasKPIType = row.some(c => {
      const s = c?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return s.includes('kpi type');
    });

    const targetsMarkers = [hasKPIGroup, hasKPIName, hasTarget, hasUnit, hasWeight, hasKPIType];
    const targetsMarkerCount = targetsMarkers.filter(Boolean).length;

    if (targetsMarkerCount >= 4) {
      headerIdx = i;
      templateType = '2025 Targets Setting Template';
      console.log(`✅ Found Targets Setting header at row ${i} with ${targetsMarkerCount} markers`);
      return { templateType, headerIdx };
    }
  }

  return { templateType, headerIdx };
}

// Test both files
async function testTemplateDetection() {
  console.log('='.repeat(80));
  console.log('📊 Testing Template Detection for Bulk Upload');
  console.log('='.repeat(80));

  const files = [
    {
      name: 'Department KPI Template',
      path: path.join(__dirname, '../download/Copy of Thu vien KPI_Template.xlsx'),
      expectedType: 'Department KPI Template'
    },
    {
      name: 'Personal KPI Template (2025 Targets Setting)',
      path: path.join(__dirname, '../download/2025 KPI Setting Template_System.xls'),
      expectedType: '2025 Targets Setting Template'
    }
  ];

  for (const file of files) {
    console.log('\n' + '-'.repeat(80));
    console.log(`📄 Testing: ${file.name}`);
    console.log(`📂 File: ${file.path}`);
    console.log('-'.repeat(80));

    try {
      const workbook = XLSX.readFile(file.path, { cellStyles: true, cellDates: true });
      const sheetName = workbook.SheetNames[0];
      console.log(`📋 Sheet: ${sheetName}`);

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // Sanitize data (convert dates)
      const sanitizedData = rawData.map(row =>
        row.map(cell => (cell instanceof Date ? cell.toISOString() : cell))
      );

      console.log(`📏 Total rows: ${sanitizedData.length}`);

      // Test detection
      const { templateType, headerIdx } = detectTemplate(sanitizedData);

      console.log('\n🎯 RESULT:');
      console.log(`   Detected Type: ${templateType}`);
      console.log(`   Expected Type: ${file.expectedType}`);
      console.log(`   Header Row: ${headerIdx}`);

      if (templateType === file.expectedType) {
        console.log('   ✅ PASS - Template detected correctly!');
      } else {
        console.log('   ❌ FAIL - Template detection mismatch!');
      }

      // Show header row content
      if (headerIdx >= 0) {
        console.log('\n📋 Header Row Content:');
        const headerRow = sanitizedData[headerIdx];
        headerRow.forEach((cell, idx) => {
          if (cell && cell.toString().trim()) {
            console.log(`   Col ${idx}: ${cell}`);
          }
        });
      }

    } catch (error) {
      console.error(`❌ Error testing ${file.name}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Template Detection Test Complete');
  console.log('='.repeat(80));
}

// Run tests
testTemplateDetection();
