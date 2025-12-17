// Script to analyze Excel file structure
const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node analyze-excel.js <path-to-excel-file>');
  process.exit(1);
}

try {
  console.log(`\n📂 Reading file: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath, {
    cellStyles: true,
    cellDates: true,
    sheetStubs: false
  });

  console.log(`📚 All Sheets in workbook:`, workbook.SheetNames, '\n');

  // Let user choose sheet or find KPI sheet
  // Try specific sheet from command line arg or find KPI sheet
  let sheetName;

  // Check if specific sheet requested (e.g., node script.js file.xlsx "Tram Nguyen")
  const requestedSheet = process.argv[3];
  if (requestedSheet && workbook.SheetNames.includes(requestedSheet)) {
    sheetName = requestedSheet;
    console.log(`📌 Using requested sheet: "${sheetName}"\n`);
  } else {
    const kpiSheetNames = workbook.SheetNames.filter(name =>
      name.toLowerCase().includes('kpi') ||
      name.toLowerCase().includes('target') ||
      name.toLowerCase().includes('setting')
    );

    if (kpiSheetNames.length > 0) {
      sheetName = kpiSheetNames[0];
      console.log(`🎯 Found KPI-related sheet: ${sheetName}\n`);
    } else {
      sheetName = workbook.SheetNames[0];
      console.log(`📊 Using first sheet: ${sheetName}\n`);
    }
  }

  const worksheet = workbook.Sheets[sheetName];

  // Get sheet range
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log(`📏 Sheet Range: ${worksheet['!ref']}`);
  console.log(`   Rows: ${range.s.r} to ${range.e.r}`);
  console.log(`   Cols: ${range.s.c} to ${range.e.c}\n`);

  // Convert to JSON array
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false
  });

  console.log(`📝 Total Non-Empty Rows: ${data.length}\n`);
  console.log(`${'='.repeat(120)}\n`);

  // Print first 50 rows with detailed info
  const rowsToPrint = Math.min(50, data.length);

  for (let i = 0; i < rowsToPrint; i++) {
    const row = data[i];

    // Count filled cells
    const filledCells = row.filter(c => c && c.toString().trim() !== '').length;

    // Get first 15 cells (or all if less)
    const cellsToShow = row.slice(0, 15);

    console.log(`Row ${i.toString().padStart(3, ' ')} [${filledCells.toString().padStart(2, ' ')} cells]:`);

    cellsToShow.forEach((cell, idx) => {
      const cellValue = cell ? cell.toString().substring(0, 50) : '';
      if (cellValue) {
        console.log(`  Col ${idx.toString().padStart(2, ' ')}: ${cellValue}`);
      }
    });

    console.log('');
  }

  console.log(`${'='.repeat(120)}\n`);

  // Try to detect header row
  console.log('🔍 Searching for header row...\n');

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    const rowText = row.join('|').toLowerCase();

    // Check for common header keywords
    const keywords = {
      'main kpi': rowText.includes('main kpi'),
      'sub-kpi': rowText.includes('sub-kpi') || rowText.includes('sub kpi'),
      'target or kpi': rowText.includes('target or kpi'),
      'target': rowText.includes('target'),
      'unit': rowText.includes('unit'),
      'weight': rowText.includes('weight'),
      'kpi type': rowText.includes('kpi type'),
      'stt': rowText.includes('stt'),
      'tên kpi': rowText.includes('tên kpi'),
      'phòng ban': rowText.includes('phòng ban'),
      'department': rowText.includes('department'),
      'job title': rowText.includes('job title')
    };

    const matchCount = Object.values(keywords).filter(Boolean).length;

    if (matchCount >= 2) {
      console.log(`Row ${i} - POTENTIAL HEADER (${matchCount} keywords):`);
      console.log(`  Keywords:`, keywords);
      console.log(`  Content:`, row.slice(0, 10));
      console.log('');
    }
  }

  console.log('\n✅ Analysis complete!\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
