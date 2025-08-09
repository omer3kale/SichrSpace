// 🎯 Mission: 100% API Success Rate Test
const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 MISSION: 100% API SUCCESS RATE');
console.log('==================================');

// Start server
console.log('📡 Starting server...');
const server = spawn('node', ['server.js'], {
  cwd: '/Users/omer3kale/SichrPlace77/SichrPlace77/backend',
  stdio: 'pipe'
});

server.stdout.on('data', (data) => {
  console.log(`Server: ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  console.error(`Server Error: ${data.toString().trim()}`);
});

// Wait for server to start then run tests
setTimeout(async () => {
  console.log('\n🧪 Running API Tests...\n');
  
  const tests = [
    {
      name: 'GET /api/apartments',
      method: 'GET',
      path: '/api/apartments',
      expectedSuccess: (body) => body.includes('"success":true') || body.includes('"data"')
    },
    {
      name: 'GET /api/conversations', 
      method: 'GET',
      path: '/api/conversations',
      expectedSuccess: (body) => body.includes('[') || body.includes('"id"')
    },
    {
      name: 'POST /api/viewing-request',
      method: 'POST', 
      path: '/api/viewing-request',
      data: JSON.stringify({
        apartment_id: "550e8400-e29b-41d4-a716-446655440010",
        user_id: "550e8400-e29b-41d4-a716-446655440000", 
        requested_date: "2025-08-15T10:00:00Z",
        message: "100% mission test"
      }),
      expectedSuccess: (body) => body.includes('"success":true')
    },
    {
      name: 'POST /api/send-message (Email)',
      method: 'POST',
      path: '/api/send-message', 
      data: JSON.stringify({
        to: "test@example.com",
        subject: "100% Mission Test",
        message: "Testing email functionality"
      }),
      expectedSuccess: (body) => body.includes('"success":true')
    }
  ];
  
  let successCount = 0;
  let totalTests = tests.length;
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${i + 1}. ${test.name}: `);
    
    try {
      const result = await makeRequest(test.method, test.path, test.data);
      if (test.expectedSuccess(result)) {
        console.log('✅ PASS');
        successCount++;
      } else {
        console.log('❌ FAIL');
        console.log(`   Response: ${result.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log('❌ FAIL - Connection Error');
      console.log(`   Error: ${error.message}`);
    }
  }
  
  const successRate = Math.round((successCount / totalTests) * 100);
  
  console.log('\n🏆 FINAL RESULTS');
  console.log('================');
  console.log(`✅ Successful tests: ${successCount}`);
  console.log(`📊 Total tests: ${totalTests}`);
  console.log(`🎯 Success rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('🎉 MISSION ACCOMPLISHED! 100% API SUCCESS RATE ACHIEVED!');
  } else {
    console.log('\n🔧 Next steps to reach 100%:');
    console.log('   1. Deploy enhanced migration to Supabase');
    console.log('   2. Fix Gmail SMTP configuration');
    console.log('   3. Verify all route handlers exist');
  }
  
  // Stop server and exit
  server.kill();
  process.exit(0);
  
}, 8000); // Wait 8 seconds for server to start

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}
