#!/usr/bin/env node
/**
 * Simple Supabase Connection Test
 */

const { supabase } = require('./config/supabase');

async function quickTest() {
  console.log('🔌 Testing Supabase Connection...');
  
  try {
    // Simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection error:', error.message);
      console.log('📋 Error details:', error);
      
      // Check if it's a table missing error
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('\n🗄️  Tables need to be created. Please run the database migration:');
        console.log('1. Go to: https://supabase.com/dashboard/project/cgkumwtibknfrhyiicoo/sql/new');
        console.log('2. Copy and run the content of: migrations/001_initial_supabase_setup.sql');
      }
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('✅ Database is ready for use');
    }
  } catch (error) {
    console.log('❌ Network or configuration error:', error.message);
  }
}

quickTest();
