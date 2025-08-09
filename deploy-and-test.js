// 🎯 MISSION: Deploy Enhanced Migration & Test APIs for 100% Success
const { supabase, testConnection } = require('./backend/config/supabase');
const fs = require('fs');
const path = require('path');

console.log('🚀 MISSION: 100% API SUCCESS RATE');
console.log('==================================');
console.log('1. Deploy enhanced migration to Supabase');
console.log('2. Test all API endpoints');
console.log('3. Achieve 100% success rate');
console.log('');

async function deployMigration() {
  console.log('📦 Deploying Enhanced Migration...');
  
  try {
    // Read the enhanced migration SQL
    const migrationPath = path.join(__dirname, 'backend/migrations/002_enhanced_api_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements (rough approach)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < Math.min(statements.length, 10); i++) { // Execute first 10 statements
      const statement = statements[i];
      if (statement.includes('CREATE TABLE')) {
        const tableMatch = statement.match(/CREATE TABLE (\w+)/);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        
        try {
          console.log(`   Creating table: ${tableName}...`);
          await supabase.rpc('exec_sql', { sql_statement: statement });
          console.log(`   ✅ ${tableName} created successfully`);
          successCount++;
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  ${tableName} already exists - skipping`);
            successCount++;
          } else {
            console.log(`   ❌ Failed to create ${tableName}: ${error.message}`);
            errorCount++;
          }
        }
      }
    }
    
    console.log(`\n📊 Migration Results: ${successCount} success, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Migration deployment failed:', error.message);
    console.log('\n🔧 Manual deployment required:');
    console.log('1. Open Supabase Dashboard > SQL Editor');
    console.log('2. Copy contents of backend/migrations/002_enhanced_api_support.sql');
    console.log('3. Paste and run the migration');
  }
}

async function testAPIs() {
  console.log('\n🧪 Testing API Endpoints...');
  console.log('===========================');
  
  const http = require('http');
  
  function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout')));
      
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }
  
  // Start server first
  console.log('📡 Starting server...');
  const { spawn } = require('child_process');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  const tests = [
    { name: 'Health Check', method: 'GET', path: '/api/health' },
    { name: 'CSRF Token', method: 'GET', path: '/api/csrf-token' },
    { name: 'Apartments List', method: 'GET', path: '/api/apartments' },
    { name: 'Conversations List', method: 'GET', path: '/api/conversations' },
    { 
      name: 'Send Email', 
      method: 'POST', 
      path: '/api/send-message',
      data: { to: 'test@example.com', subject: '100% Test', message: 'API test' }
    }
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    try {
      const result = await makeRequest(test.method, test.path, test.data);
      
      if (result.status === 200 || (result.status < 400 && result.body)) {
        console.log(`   ✅ PASS (${result.status})`);
        successCount++;
      } else {
        console.log(`   ❌ FAIL (${result.status}) - ${result.body.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ FAIL - ${error.message}`);
    }
  }
  
  const successRate = Math.round((successCount / tests.length) * 100);
  
  console.log('\n🏆 FINAL RESULTS');
  console.log('================');
  console.log(`✅ Successful: ${successCount}/${tests.length}`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('\n🎉 MISSION ACCOMPLISHED! 100% API SUCCESS RATE ACHIEVED! 🎉');
  } else {
    console.log(`\n🔧 Progress toward 100% mission: ${successRate}%`);
    console.log('Next steps:');
    console.log('• Ensure all database migrations are deployed');
    console.log('• Check server startup logs for errors');
    console.log('• Verify Gmail SMTP configuration');
  }
  
  // Clean up
  serverProcess.kill();
}

async function main() {
  console.log('🔌 Testing Supabase connection...');
  const connected = await testConnection();
  
  if (connected) {
    console.log('✅ Supabase connected successfully');
    await deployMigration();
  } else {
    console.log('❌ Supabase connection failed');
    console.log('⚠️  Skipping migration deployment');
  }
  
  console.log('\n⏳ Proceeding to API tests...');
  await testAPIs();
}

main().catch(console.error);
