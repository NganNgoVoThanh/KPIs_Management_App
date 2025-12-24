const http = require('http');

function testKpiUpdate() {
  const kpiData = {
    title: "Test KPI Update",
    description: "Testing date conversion",
    type: "QUANT_HIGHER_BETTER",
    unit: "score",
    target: 70,
    weight: 30,
    dataSource: "Dashboard",
    category: "Individual Development",
    frequency: "Quarterly",
    priority: "Medium",
    startDate: "2026-01-01",  // Date-only format
    dueDate: "2026-12-31",     // Date-only format
    formula: null,
    evidenceRequirements: null,
    ogsmAlignment: "Test",
    dependencies: null,
    scoringRules: null
  };

  const postData = JSON.stringify(kpiData);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/kpi/8e4ee7d8-451e-45ef-bfa3-ab21635a42d1',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-user-id': '0301252c-e72b-4707-81e6-b58926ee6452'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('\n🧪 Test KPI Update with Date Conversion\n');
      console.log('Status Code:', res.statusCode);
      console.log('Response:', JSON.parse(data));

      if (res.statusCode === 200) {
        console.log('\n✅ SUCCESS - Date conversion working!');
      } else {
        console.log('\n❌ FAILED - Check error above');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error);
  });

  req.write(postData);
  req.end();
}

console.log('Testing KPI update with date-only format...');
console.log('Input dates: "2026-01-01" and "2026-12-31"');
console.log('Expected: Should convert to ISO DateTime format\n');

testKpiUpdate();
