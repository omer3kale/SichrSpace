#!/usr/bin/env node
/**
 * Simple Test User Creation Script
 * Creates the test user with properly hashed password (compatible with current schema)
 */

const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createTestUser() {
  console.log('🔐 Creating test user with hashed password...');
  
  // Hash the password
  const password = 'ricardoquaresma7*';
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  console.log(`📧 Email: omer3kale@gmail.com`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🔐 Hashed: ${hashedPassword}`);
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // First, try to delete existing user if exists
    await supabase
      .from('users')
      .delete()
      .eq('email', 'omer3kale@gmail.com');
    
    // Insert the test user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username: 'omer3kale',
          email: 'omer3kale@gmail.com',
          password: hashedPassword,
          role: 'admin',
          first_name: 'Omer',
          last_name: 'Kale',
          email_verified: true,
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
          data_processing_consent: true,
          blocked: false,
          marketing_consent: false
        }
      ])
      .select();
    
    if (error) {
      console.error('❌ Error creating test user:', error);
      return false;
    }
    
    console.log('✅ Test user created successfully:', data);
    
    // Create sample apartments owned by this user
    const userId = data[0].id;
    await createSampleApartments(supabase, userId);
    
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err);
    return false;
  }
}

async function createSampleApartments(supabase, userId) {
  console.log('🏠 Creating sample apartments...');
  
  // First, delete any existing apartments for this user
  await supabase
    .from('apartments')
    .delete()
    .eq('owner_id', userId);
  
  const apartments = [
    {
      title: 'Beautiful Apartment in Köln',
      description: 'Spacious and modern apartment in the heart of Cologne. Perfect for professionals or small families. Recently renovated with high-quality finishes.',
      location: 'Cologne City Center, Germany',
      price: 850.00,
      size: 75,
      rooms: 3,
      bathrooms: 1,
      available_from: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner_id: userId,
      images: ['../img/koeln.jpg', '../img/koeln2.jpg', '../img/koeln3.jpg'],
      amenities: ['High-speed Internet', 'Balcony', 'Elevator', 'Parking', 'Central Heating'],
      pet_friendly: false,
      furnished: true,
      balcony: true,
      parking: true,
      elevator: true,
      internet: true,
      country: 'Germany',
      status: 'available'
    },
    {
      title: 'Cozy Studio near University',
      description: 'Perfect for students! Fully furnished studio apartment close to University of Cologne. All utilities included in rent.',
      location: 'University District, Cologne',
      price: 650.00,
      size: 45,
      rooms: 1,
      bathrooms: 1,
      available_from: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner_id: userId,
      images: ['../img/koeln4.jpg', '../img/koeln5.jpg'],
      amenities: ['Furnished', 'Internet', 'Washing Machine', 'Central Heating'],
      pet_friendly: true,
      furnished: true,
      balcony: false,
      parking: false,
      elevator: false,
      internet: true,
      country: 'Germany',
      status: 'available'
    },
    {
      title: 'Luxury Penthouse with Garden',
      description: 'Stunning penthouse apartment with private garden and panoramic city views. Premium location with all modern amenities.',
      location: 'Cologne Old Town, Germany',
      price: 1200.00,
      size: 120,
      rooms: 4,
      bathrooms: 2,
      available_from: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner_id: userId,
      images: ['../img/koeln6.jpg', '../img/apartment1.jpg', '../img/apartment2.jpg'],
      amenities: ['Garden', 'Balcony', 'Dishwasher', 'Parking', 'Elevator', 'Internet', 'Premium Location'],
      pet_friendly: false,
      furnished: false,
      balcony: true,
      parking: true,
      elevator: true,
      internet: true,
      country: 'Germany',
      status: 'available'
    }
  ];
  
  const { data, error } = await supabase
    .from('apartments')
    .insert(apartments)
    .select();
  
  if (error) {
    console.error('❌ Error creating sample apartments:', error);
  } else {
    console.log(`✅ Created ${data.length} sample apartments`);
  }
}

// Run the script
if (require.main === module) {
  createTestUser()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Script error:', err);
      process.exit(1);
    });
}

module.exports = { createTestUser };
