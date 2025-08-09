// Simple server start test
console.log('🎯 Testing server startup for 100% mission...');
console.log('===============================================');

process.chdir('/Users/omer3kale/SichrPlace77/SichrPlace77/backend');
console.log('Changed to backend directory');

// Test environment variables
console.log('\n📋 Environment Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// Test dotenv loading
require('dotenv').config({ path: './.env' });
console.log('After dotenv:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET');

// Test basic Express
try {
  console.log('\n📦 Testing Express import...');
  const express = require('express');
  console.log('✅ Express imported successfully');
  
  console.log('\n📦 Testing Supabase config...');
  const { supabase, testConnection } = require('./config/supabase');
  console.log('✅ Supabase config imported successfully');
  
  console.log('\n🔌 Testing Supabase connection...');
  testConnection().then(connected => {
    if (connected) {
      console.log('✅ Supabase connection successful');
    } else {
      console.log('❌ Supabase connection failed');
    }
    console.log('\n✅ Basic tests completed - server should be able to start');
  }).catch(err => {
    console.log('❌ Supabase connection error:', err.message);
    console.log('\n⚠️  Server may start but database operations will fail');
  });
  
} catch (error) {
  console.error('❌ Error during basic tests:', error.message);
  console.log('\n🔧 This needs to be fixed before server can start');
}
