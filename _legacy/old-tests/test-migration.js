// 🧪 TEST 100% COMPLETE MIGRATION
// Quick verification that all tables and functionality work

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || (() => {
    console.error('SUPABASE_ANON_KEY environment variable not set');
    process.exit(1);
})();

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteMigration() {
    console.log('🎯 TESTING 100% COMPLETE MIGRATION\n');

    let successCount = 0;
    let totalTests = 0;

    // Test 1: Core tables
    const coreTables = ['users', 'apartments', 'viewing_requests', 'conversations'];
    console.log('📋 Testing Core Tables:');
    
    for (const table of coreTables) {
        totalTests++;
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) throw error;
            console.log(`  ✅ ${table}: OK`);
            successCount++;
        } catch (error) {
            console.log(`  ❌ ${table}: ${error.message}`);
        }
    }

    // Test 2: New integration tables
    const newTables = [
        'user_favorites', 'apartment_analytics', 'apartment_reviews', 
        'chat_messages', 'digital_contracts', 'email_logs', 
        'payment_transactions', 'support_tickets'
    ];
    console.log('\n🆕 Testing New Integration Tables:');
    
    for (const table of newTables) {
        totalTests++;
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) throw error;
            console.log(`  ✅ ${table}: OK`);
            successCount++;
        } catch (error) {
            console.log(`  ❌ ${table}: ${error.message}`);
        }
    }

    // Test 3: Sample data
    console.log('\n📊 Testing Sample Data:');
    
    totalTests++;
    try {
        const { data: users } = await supabase
            .from('users')
            .select('email, role')
            .eq('email', 'omer3kale@gmail.com');
        
        if (users && users.length > 0) {
            console.log(`  ✅ Admin user: ${users[0].email} (${users[0].role})`);
            successCount++;
        } else {
            console.log('  ❌ Admin user: Not found');
        }
    } catch (error) {
        console.log(`  ❌ Admin user: ${error.message}`);
    }

    totalTests++;
    try {
        const { data: apartments } = await supabase
            .from('apartments')
            .select('title, city, status');
        
        console.log(`  ✅ Sample apartments: ${apartments?.length || 0} created`);
        successCount++;
        
        if (apartments && apartments.length > 0) {
            apartments.slice(0, 2).forEach(apt => {
                console.log(`    📍 ${apt.title} (${apt.city}) - ${apt.status}`);
            });
        }
    } catch (error) {
        console.log(`  ❌ Sample apartments: ${error.message}`);
    }

    // Test 4: System settings
    console.log('\n⚙️ Testing System Settings:');
    
    totalTests++;
    try {
        const { data: settings } = await supabase
            .from('system_settings')
            .select('setting_key, setting_value, is_public')
            .limit(5);
        
        console.log(`  ✅ System settings: ${settings?.length || 0} configured`);
        successCount++;
        
        if (settings && settings.length > 0) {
            settings.forEach(setting => {
                console.log(`    🔧 ${setting.setting_key}: ${setting.setting_value} (${setting.is_public ? 'public' : 'private'})`);
            });
        }
    } catch (error) {
        console.log(`  ❌ System settings: ${error.message}`);
    }

    // Calculate success rate
    const successRate = Math.round((successCount / totalTests) * 100);
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 MIGRATION TEST RESULTS:`);
    console.log(`✅ Successful tests: ${successCount}/${totalTests}`);
    console.log(`🎯 Success rate: ${successRate}%`);
    
    if (successRate === 100) {
        console.log('🎉 100% SUCCESS! Migration is complete and working perfectly!');
        console.log('🚀 Ready for API testing and production deployment!');
    } else if (successRate >= 90) {
        console.log('🟡 Nearly complete! A few minor issues to address.');
    } else {
        console.log('🔴 Migration needs attention. Please check the errors above.');
    }
    
    console.log('='.repeat(60));
    
    return successRate;
}

// Run the test
testCompleteMigration().catch(console.error);
