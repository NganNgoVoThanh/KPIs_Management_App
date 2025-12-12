// Test Authentication Flow
// This script tests the complete authentication flow

const path = require('path')
const fs = require('fs')

console.log('=== Testing Authentication Flow ===\n')

// 1. Check if user exists in database
console.log('1. Checking database for admin user...')
const userFilePath = path.join(process.cwd(), '.local-storage', 'users', 'user-admin-1.json')

try {
  const userData = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'))
  console.log('✅ Admin user found in database:')
  console.log('   ID:', userData.id)
  console.log('   Email:', userData.email)
  console.log('   Role:', userData.role)
  console.log('   Status:', userData.status)
  console.log('')

  // 2. Simulate what should be in localStorage
  console.log('2. Expected localStorage data:')
  const localStorageData = {
    user: userData,
    expiry: new Date().getTime() + (24 * 60 * 60 * 1000)
  }
  console.log('   Key: vicc_kpi_current_user')
  console.log('   User ID:', userData.id)
  console.log('   User Role:', userData.role)
  console.log('')

  // 3. Simulate what the x-user-id header should be
  console.log('3. Expected API request header:')
  console.log('   x-user-id:', userData.id)
  console.log('')

  // 4. Simulate server-side authentication
  console.log('4. Server-side authentication simulation:')
  console.log('   Looking for user file: .local-storage/users/' + userData.id + '.json')
  console.log('   File exists:', fs.existsSync(userFilePath))
  console.log('   User role from file:', userData.role)
  console.log('   Authorization check: user.role === "ADMIN":', userData.role === 'ADMIN')
  console.log('')

  if (userData.role === 'ADMIN') {
    console.log('✅ AUTHENTICATION FLOW SHOULD WORK!')
    console.log('\nIf you are still experiencing 403 errors, the issue is likely:')
    console.log('1. localStorage data is corrupted or has wrong user ID')
    console.log('2. x-user-id header is not being sent correctly')
    console.log('3. Browser cache needs to be cleared')
    console.log('\nRecommended fixes:')
    console.log('1. Open browser DevTools → Application → Local Storage')
    console.log('2. Find key: vicc_kpi_current_user')
    console.log('3. Delete it')
    console.log('4. Login again with admin@intersnack.com.vn')
    console.log('5. Check Network tab → Headers → Request Headers → x-user-id should be:', userData.id)
  } else {
    console.log('❌ User role is not ADMIN!')
    console.log('Current role:', userData.role)
  }

} catch (error) {
  console.error('❌ Error reading user file:', error.message)
  console.log('\nPlease run: npm run dev')
  console.log('Then login with admin@intersnack.com.vn to create the user')
}

console.log('\n=== Test Complete ===')
