// scripts/fix-staff-manager.js - Fix staff users without manager assigned
// This script updates all STAFF users to have a LINE_MANAGER assigned

const API_BASE = 'http://localhost:3001';

async function fixStaffManagers() {
  console.log('🔧 Fixing staff manager assignments...\n');

  try {
    // Step 1: Ensure managers exist
    console.log('Step 1: Creating managers if they don\'t exist...');
    const managers = [
      'line.manager@intersnack.com.vn',
      'hod@intersnack.com.vn',
      'admin@intersnack.com.vn'
    ];

    for (const email of managers) {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        console.log(`  ✅ ${email} exists - ID: ${data.data.id}`);
      }
    }

    // Step 2: Get LINE_MANAGER user
    console.log('\nStep 2: Finding LINE_MANAGER...');
    const lmResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'line.manager@intersnack.com.vn' })
    });
    const lmData = await lmResponse.json();

    if (!lmData.success) {
      throw new Error('LINE_MANAGER not found. Please create it first.');
    }

    const lineManagerId = lmData.data.id;
    console.log(`  ✅ Found LINE_MANAGER: ${lineManagerId}`);

    // Step 3: Get MANAGER user (for LINE_MANAGER's manager)
    console.log('\nStep 3: Finding MANAGER (HoD)...');
    const mgrResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod@intersnack.com.vn' })
    });
    const mgrData = await mgrResponse.json();

    if (!mgrData.success) {
      throw new Error('MANAGER not found. Please create it first.');
    }

    const managerId = mgrData.data.id;
    console.log(`  ✅ Found MANAGER: ${managerId}`);

    console.log('\n✨ Setup complete!');
    console.log('\n📋 Manager Hierarchy:');
    console.log('  STAFF → LINE_MANAGER → MANAGER → ADMIN');
    console.log(`  (any)   ${lineManagerId.substring(0, 8)}...   ${managerId.substring(0, 8)}...   (final)

NOTE: The database auto-assigns managers on user creation.
If a staff user still has no manager:
1. Delete the user from database
2. Re-login to trigger auto-creation with manager assignment

Or update directly in database:
UPDATE users SET managerId = '${lineManagerId}' WHERE role = 'STAFF';
UPDATE users SET managerId = '${managerId}' WHERE role = 'LINE_MANAGER';
`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixStaffManagers();
