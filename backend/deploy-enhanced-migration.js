// Deploy enhanced migration to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployEnhancedMigration() {
  try {
    console.log('📦 Reading enhanced migration file...');
    const migrationPath = path.join(__dirname, 'migrations', '002_enhanced_api_support.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Deploying enhanced migration to Supabase...');
    console.log('Migration includes: email_logs, payment_transactions, support_tickets, safety_reports, notifications, system_settings, gdpr_tracking_logs tables');
    
    // Split the SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Check if error is about table already existing (which is OK for IF NOT EXISTS)
          if (error.message.includes('already exists') || error.message.includes('IF NOT EXISTS')) {
            console.log(`⚠️  Statement ${i + 1}: Table/column already exists (skipping)`);
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          }
        } else {
          successCount++;
          if (i % 10 === 0) {
            console.log(`✅ Progress: ${i + 1}/${statements.length} statements processed`);
          }
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} error:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎯 Migration deployment complete!`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('🎉 Enhanced migration deployed successfully!');
      console.log('📊 Database now includes comprehensive API support tables');
    } else if (errorCount < 5) {
      console.log('⚠️  Migration mostly successful with minor issues');
    } else {
      console.log('🚨 Migration had significant issues, please check manually');
    }
    
  } catch (err) {
    console.error('❌ Migration deployment failed:', err.message);
    process.exit(1);
  }
}

deployEnhancedMigration();
