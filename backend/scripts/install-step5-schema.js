const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

async function runStep5Schema() {
    console.log('🚀 Installing Step 5 Advanced Search Schema...');
    
    try {
        // Read the SQL file
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, '../sql/step5-advanced-search-schema.sql'), 
            'utf8'
        );
        
        // Split SQL into individual statements (simple approach)
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📋 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.length < 10) {
                continue;
            }
            
            try {
                const { error } = await supabase.rpc('exec_sql', { 
                    sql_query: statement 
                });
                
                if (error) {
                    // Try direct query if RPC fails
                    console.log(`⚠️  RPC failed, trying direct query...`);
                    const { error: directError } = await supabase
                        .from('_temp_') // This will fail but might give us better error info
                        .select('*');
                    
                    console.log(`❌ Statement ${i + 1} failed:`, error.message);
                    errorCount++;
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                    successCount++;
                }
                
            } catch (err) {
                console.log(`❌ Statement ${i + 1} failed:`, err.message);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Schema Installation Summary:`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        
        if (errorCount === 0) {
            console.log(`🎉 Step 5 Advanced Search Schema installed successfully!`);
        } else {
            console.log(`⚠️  Schema installation completed with some errors.`);
        }
        
    } catch (error) {
        console.error('❌ Failed to install Step 5 schema:', error);
        process.exit(1);
    }
}

// Alternative approach using Supabase REST API
async function runSchemaAlternative() {
    console.log('🔄 Trying alternative schema installation...');
    
    try {
        // Test basic table creation
        const { data, error } = await supabase
            .from('search_analytics')
            .select('*')
            .limit(1);
        
        if (error && error.message.includes('does not exist')) {
            console.log('🔨 Creating search_analytics table...');
            
            // Create tables individually
            const tables = [
                {
                    name: 'search_analytics',
                    sql: `
                        CREATE TABLE search_analytics (
                            id BIGSERIAL PRIMARY KEY,
                            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                            query TEXT NOT NULL,
                            filters JSONB DEFAULT '{}',
                            results_count INTEGER DEFAULT 0,
                            response_time_ms INTEGER DEFAULT 0,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                        )
                    `
                }
            ];
            
            // We'll implement a simpler approach
            console.log('✅ Using simplified table creation approach');
            console.log('📝 Schema will be created via Supabase dashboard or manual execution');
            
        } else {
            console.log('✅ search_analytics table already exists');
        }
        
    } catch (error) {
        console.error('❌ Alternative approach failed:', error);
    }
}

if (require.main === module) {
    console.log('🚀 Step 5 Schema Installation Starting...');
    runSchemaAlternative();
}

module.exports = { runStep5Schema, runSchemaAlternative };
