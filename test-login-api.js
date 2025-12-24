const https = require('http');

function testLogin(email) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Login API with TiDB SSL Connection\n');

  const testCases = [
    { email: 'admin@intersnack.com.vn', expectedRole: 'ADMIN' },
    { email: 'linemanager@intersnack.com.vn', expectedRole: 'LINE_MANAGER' },
    { email: 'hod@intersnack.com.vn', expectedRole: 'MANAGER' },
    { email: 'ngan.ngo@intersnack.com.vn', expectedRole: 'STAFF' }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📧 Testing: ${testCase.email}`);
      console.log('─'.repeat(80));

      const result = await testLogin(testCase.email);

      if (result.status === 200 && result.data.success) {
        console.log(`✅ SUCCESS`);
        console.log(`   Name: ${result.data.data.name}`);
        console.log(`   Role: ${result.data.data.role}`);
        console.log(`   Status: ${result.data.data.status}`);
        console.log(`   Message: ${result.data.message}`);

        if (result.data.data.role !== testCase.expectedRole) {
          console.log(`   ⚠️  WARNING: Expected role ${testCase.expectedRole}, got ${result.data.data.role}`);
        }
      } else {
        console.log(`❌ FAILED`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n\n✅ All tests completed!');
  console.log('If all tests passed, SSL connection is working correctly.\n');
}

runTests();
