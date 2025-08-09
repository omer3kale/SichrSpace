const bcrypt = require('bcryptjs');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Gokhangulec29*', 12);
    
    // Create admin user
    const adminUser = {
      username: 'sichrplace_admin',
      email: 'sichrplace@gmail.com',
      password: hashedPassword,
      role: 'admin',
      first_name: 'SichrPlace',
      last_name: 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([adminUser])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Duplicate key error
        console.log('✅ Admin user already exists');
        
        // Get the existing user
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'sichrplace@gmail.com')
          .single();
          
        if (existingUser) {
          console.log('📋 Existing admin user:', {
            id: existingUser.id,
            username: existingUser.username,
            email: existingUser.email,
            role: existingUser.role
          });
        }
      } else {
        throw error;
      }
    } else {
      console.log('✅ Admin user created successfully:', {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role
      });
    }
    
    // Test login with the admin credentials
    console.log('\n🔍 Testing login...');
    const loginResponse = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'sichrplace@gmail.com',
        password: 'Gokhangulec29*'
      })
    });
    
    const loginData = await loginResponse.json();
    if (loginResponse.ok) {
      console.log('✅ Login test successful');
      console.log('🎫 JWT Token:', loginData.token.substring(0, 50) + '...');
      console.log('👤 User:', loginData.user);
    } else {
      console.log('❌ Login test failed:', loginData);
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
