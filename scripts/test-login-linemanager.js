const API_URL = 'http://localhost:3001/api/auth/login';

async function testLogin() {
  console.log('=== Testing Login API for linemanager ===\n');
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'linemanager@intersnack.com.vn' })
  });
  
  const data = await response.json();
  
  console.log('API Response:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.success && data.data) {
    const user = data.data;
    console.log('\n✅ Login successful!');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  ID:', user.id);
    
    if (user.role === 'LINE_MANAGER') {
      console.log('\n✅ Role is correct: LINE_MANAGER');
    } else {
      console.log('\n❌ Role is WRONG:', user.role);
      console.log('Expected: LINE_MANAGER');
    }
  } else {
    console.log('\n❌ Login failed:', data.error);
  }
}

testLogin().catch(console.error);
