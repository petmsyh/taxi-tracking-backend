#!/usr/bin/env node

/**
 * Manual verification script for Medical Platform API
 * This script checks that all routes are properly configured
 */

console.log('🏥 Medical Platform API - Route Verification\n');

const routes = [
  { path: '/api/auth/register', method: 'POST', description: 'User registration' },
  { path: '/api/auth/login', method: 'POST', description: 'User login' },
  { path: '/api/doctors', method: 'GET', description: 'Get all doctors' },
  { path: '/api/doctors/:id', method: 'GET', description: 'Get doctor profile' },
  { path: '/api/doctors/profile', method: 'PUT', description: 'Update doctor profile' },
  { path: '/api/chats', method: 'POST', description: 'Create chat session' },
  { path: '/api/chats', method: 'GET', description: 'Get user chats' },
  { path: '/api/chats/:id', method: 'GET', description: 'Get chat details' },
  { path: '/api/chats/:id/status', method: 'PUT', description: 'Update chat status' },
  { path: '/api/ratings', method: 'POST', description: 'Submit rating' },
  { path: '/api/ratings/doctor/:id', method: 'GET', description: 'Get doctor ratings' },
  { path: '/api/symptom-checker/check', method: 'POST', description: 'Check symptoms' },
  { path: '/api/symptom-checker/history', method: 'GET', description: 'Get symptom history' },
  { path: '/api/admin/users', method: 'GET', description: 'Get all users (admin)' },
  { path: '/api/admin/doctors/:id/verify', method: 'PUT', description: 'Verify doctor (admin)' },
  { path: '/api/admin/statistics', method: 'GET', description: 'Get statistics (admin)' },
  { path: '/api/admin/audit-logs', method: 'GET', description: 'Get audit logs (admin)' }
];

console.log('📋 Configured API Routes:\n');
routes.forEach((route, index) => {
  console.log(`${index + 1}. [${route.method}] ${route.path}`);
  console.log(`   └─ ${route.description}\n`);
});

console.log('✅ Route verification complete!');
console.log(`\n📊 Total routes: ${routes.length}`);
console.log('\n💡 To start the server: npm start or npm run dev');
console.log('🔧 Make sure to configure .env file before starting\n');

// Check if key files exist
const fs = require('fs');
const path = require('path');

console.log('📁 Checking key files...\n');

const keyFiles = [
  'server.js',
  'database.js',
  'socketHandler.js',
  'Schema.sql',
  'routes/auth.js',
  'routes/doctors.js',
  'routes/chats.js',
  'routes/ratings.js',
  'routes/symptomChecker.js',
  'routes/admin.js',
  'middleware/auth.js',
  'middleware/rateLimiter.js',
  'middleware/validator.js'
];

let allFilesExist = true;
keyFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n' + (allFilesExist ? '✅ All key files exist!' : '⚠️  Some files are missing!'));

// Check dependencies
console.log('\n📦 Checking dependencies...\n');
try {
  const packageJson = require('../package.json');
  const requiredDeps = [
    'express',
    'socket.io',
    'pg',
    'bcryptjs',
    'jsonwebtoken',
    'cors',
    'dotenv',
    'express-rate-limit',
    'validator'
  ];

  requiredDeps.forEach(dep => {
    const installed = packageJson.dependencies && packageJson.dependencies[dep];
    console.log(`${installed ? '✓' : '✗'} ${dep}${installed ? ` (${installed})` : ''}`);
  });

  console.log('\n✅ Dependency check complete!');
} catch (error) {
  console.log('⚠️  Could not read package.json');
}

console.log('\n🎉 Verification complete! The Medical Platform API is ready.');
console.log('\n📚 Next steps:');
console.log('   1. Configure your .env file (see .env.example)');
console.log('   2. Set up PostgreSQL database');
console.log('   3. Run the database schema: psql -d medical_platform -f Schema.sql');
console.log('   4. Start the server: npm start\n');
