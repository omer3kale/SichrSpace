// Add test user to Supabase with correct credentials
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabaseUrl = 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Vtd3RpYmtuZnJoeWlpY29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwMTc4NiwiZXhwIjoyMDY5ODc3Nzc4Nn0.5piAC3CPud7oRvA1Rtypn60dfz5J1ydqoG2oKj-Su3M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTestUser() {
  try {
    console.log('🔑 Generating password hash...');
    const passwordHash = await bcrypt.hash('Ricardoquaresma7*', 10);
    console.log('Hash generated:', passwordHash);
    
    console.log('👤 Creating test user in Supabase...');
    const { data, error } = await supabase
      .from('users')
      .upsert({
        username: 'omer3kale',
        email: 'omer3kale@gmail.com',
        password: passwordHash,
        role: 'admin',
        first_name: 'Omer',
        last_name: 'Kale',
        email_verified: true,
        gdpr_consent: true,
        gdpr_consent_date: new Date().toISOString(),
        data_processing_consent: true,
        account_status: 'active'
      }, {
        onConflict: 'email'
      });
    
    if (error) {
      console.error('❌ Error creating user:', error);
    } else {
      console.log('✅ Test user created successfully!');
      console.log('📧 Email: omer3kale@gmail.com');
      console.log('🔐 Password: Ricardoquaresma7*');
      console.log('👨‍💼 Role: admin');
    }
    
  } catch (err) {
    console.error('❌ Failed to create test user:', err.message);
  }
}

addTestUser();
