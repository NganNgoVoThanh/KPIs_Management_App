// scripts/seed-managers.js - Seed default managers for testing
// Run this script BEFORE testing staff KPI submission

const managers = [
  { email: 'admin@intersnack.com.vn', password: '123456' },
  { email: 'hod@intersnack.com.vn', password: '123456' },
  { email: 'line.manager@intersnack.com.vn', password: '123456' }
];

async function seedManagers() {
  console.log('🌱 Seeding managers...\n');

  for (const manager of managers) {
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manager)
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ ${manager.email} - Role: ${data.data.role} - ID: ${data.data.id}`);
      } else {
        console.log(`❌ ${manager.email} - Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ ${manager.email} - Failed:`, error.message);
    }
  }

  console.log('\n✨ Manager seeding complete!');
  console.log('📝 Now you can login as staff and they will have managers assigned.');
}

seedManagers();
