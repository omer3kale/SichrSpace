/**
 * Enable and Verify Supabase Realtime for SichrPlace Chat
 * 
 * This script helps you enable realtime on the required tables
 * and verify that everything is working correctly.
 */

const { supabase } = require('./config/supabase');

async function enableRealtimeForChat() {
  console.log('🚀 SichrPlace Realtime Setup\n');

  try {
    // Step 1: Check current realtime tables
    console.log('📋 Step 1: Checking current realtime publications...');
    const { data: currentPubs, error: pubError } = await supabase
      .from('pg_publication_tables')
      .select('tablename')
      .eq('pubname', 'supabase_realtime');

    if (pubError) {
      console.log('⚠️  Cannot check publications (this is normal for anon key)');
    } else {
      console.log('Current realtime tables:', currentPubs?.map(p => p.tablename) || []);
    }

    // Step 2: Test table access
    console.log('\n📊 Step 2: Testing table access...');
    const tables = ['users', 'conversations', 'messages'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accessible (${data.length} rows checked)`);
      }
    }

    // Step 3: Instructions for manual setup
    console.log('\n🔧 Step 3: MANUAL SETUP REQUIRED');
    console.log('Go to your Supabase Dashboard and enable realtime:');
    console.log('');
    console.log('Dashboard URL: https://supabase.com/dashboard/project/cgkumwtibknfrhyiicoo');
    console.log('');
    console.log('Navigate to: Database > Replication');
    console.log('');
    console.log('Enable these tables:');
    console.log('- ✅ messages');
    console.log('- ✅ conversations');
    console.log('- ✅ users');
    console.log('');
    console.log('OR run this SQL in Database > SQL Editor:');
    console.log('');
    console.log('ALTER PUBLICATION supabase_realtime ADD TABLE messages;');
    console.log('ALTER PUBLICATION supabase_realtime ADD TABLE conversations;');
    console.log('ALTER PUBLICATION supabase_realtime ADD TABLE users;');

    // Step 4: Test realtime connection
    console.log('\n🔄 Step 4: Testing realtime connection...');
    
    try {
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' }, 
          (payload) => console.log('📨 Realtime test:', payload)
        )
        .subscribe((status) => {
          console.log('📡 Channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime connection successful!');
            console.log('');
            console.log('🎉 Your chat system is ready!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Start your server: npm run dev:supabase');
            console.log('2. Open frontend/chat.html');
            console.log('3. Test real-time messaging!');
          }
          
          // Clean up after test
          setTimeout(() => {
            supabase.removeChannel(channel);
            process.exit(0);
          }, 2000);
        });

    } catch (realtimeError) {
      console.log('⚠️  Realtime test error:', realtimeError.message);
      console.log('This is normal if realtime tables are not yet enabled.');
    }

  } catch (error) {
    console.error('❌ Setup error:', error.message);
    console.log('');
    console.log('Manual setup required - check the guide above.');
  }
}

// Run the setup
enableRealtimeForChat();
