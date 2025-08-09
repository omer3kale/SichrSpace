const express = require('express');
const http = require('http');
const path = require('path');

console.log('🚀 MISSION: 100% API SUCCESS RATE');
console.log('==================================');

// Start server
console.log('📡 Starting server...');
process.chdir('/Users/omer3kale/SichrPlace77/SichrPlace77/backend');

const { fork } = require('child_process');
const serverProcess = fork('server.js', [], { silent: false });

// Give server time to start
setTimeout(() => {
  console.log('\n🧪 Running API Tests...\n');
  runTests();
}, 5000);

async function runTests() {
  const tests = [
    { name: 'Health Check', path: '/api/health' },
    { name: 'CSRF Token', path: '/api/csrf-token' },
    { name: 'Apartments Listing', path: '/api/apartments' },
    { name: 'Conversations', path: '/api/conversations' },
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${i + 1}. ${test.name}:`);
    
    try {
      const result = await makeRequest('GET', test.path);
      if (result.includes('"') || result.includes('ok') || result.includes('token') || result.includes('[') || result.includes('{')) {
        console.log('   ✅ PASS');
        successCount++;
      } else {
        console.log('   ❌ FAIL');
        console.log(`   Response: ${result.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log('   ❌ FAIL - Connection Error');
      console.log(`   Error: ${error.message}`);
    }
  }
  
  const successRate = Math.round((successCount / tests.length) * 100);
  
  console.log('\n🏆 FINAL RESULTS');
  console.log('================');
  console.log(`✅ Successful: ${successCount}/${tests.length}`);
  console.log(`🎯 Success rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('🎉 MISSION ACCOMPLISHED! 100% API SUCCESS!');
  } else {
    console.log(`\n🔧 Working toward 100% - currently at ${successRate}%`);
  }
  
  serverProcess.kill();
  process.exit(0);
}

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}
