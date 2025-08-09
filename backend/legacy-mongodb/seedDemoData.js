const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Apartment = require('../models/Apartment');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Demo users data
const demoUsers = [
  {
    name: 'Emma Schmidt',
    email: 'sichrplace+emma@gmail.com',
    password: 'Demo123!',
    role: 'landlord',
    phone: '+49 30 12345678',
    isVerified: true
  },
  {
    name: 'Max Mueller',
    email: 'sichrplace+max@gmail.com', 
    password: 'Demo123!',
    role: 'landlord',
    phone: '+49 40 87654321',
    isVerified: true
  },
  {
    name: 'Sarah Johnson',
    email: 'sichrplace+sarah@gmail.com',
    password: 'Demo123!',
    role: 'tenant',
    phone: '+49 89 11223344',
    isVerified: true
  },
  {
    name: 'David Brown',
    email: 'sichrplace+david@gmail.com',
    password: 'Demo123!',
    role: 'tenant', 
    phone: '+49 221 55667788',
    isVerified: true
  },
  {
    name: 'Lisa Wang',
    email: 'sichrplace+lisa@gmail.com',
    password: 'Demo123!',
    role: 'tenant',
    phone: '+49 69 99887766',
    isVerified: true
  }
];

// Demo apartments data
const demoApartments = [
  {
    title: 'Modern 2BR Apartment in Mitte',
    description: 'Beautiful modern apartment in the heart of Berlin. Fully furnished with high-end appliances, hardwood floors, and large windows providing plenty of natural light. Located near public transportation and shopping centers.',
    address: 'Friedrichstraße 123',
    city: 'Berlin',
    zipCode: '10117',
    state: 'Berlin',
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    area: 85,
    rent: 1800,
    deposit: 3600,
    amenities: ['furnished', 'elevator', 'balcony'],
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800'
    ],
    contactPhone: '+49 30 12345678',
    availableFrom: new Date('2024-02-01'),
    status: 'available'
  },
  {
    title: 'Cozy Studio in Schwabing',
    description: 'Charming studio apartment in Munich\'s trendy Schwabing district. Perfect for students or young professionals. Includes all utilities and high-speed internet. Walking distance to university and city center.',
    address: 'Leopoldstraße 45',
    city: 'Munich',
    zipCode: '80802',
    state: 'Bavaria',
    propertyType: 'studio',
    bedrooms: 0,
    bathrooms: 1,
    area: 35,
    rent: 950,
    deposit: 1900,
    amenities: ['furnished', 'parking'],
    photos: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
    ],
    contactPhone: '+49 89 98765432',
    availableFrom: new Date('2024-01-15'),
    status: 'available'
  },
  {
    title: 'Spacious 3BR Family Home',
    description: 'Large family home with garden in quiet residential area. Three bedrooms, two bathrooms, modern kitchen, and private parking. Great for families with children. Near schools and parks.',
    address: 'Gartenstraße 78',
    city: 'Hamburg',
    zipCode: '22765',
    state: 'Hamburg',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    rent: 2200,
    deposit: 4400,
    amenities: ['parking', 'garden', 'pets'],
    photos: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
    ],
    contactPhone: '+49 40 87654321',
    availableFrom: new Date('2024-03-01'),
    status: 'available'
  },
  {
    title: 'Industrial Loft in Kreuzberg',
    description: 'Unique industrial loft with exposed brick walls and high ceilings. Located in vibrant Kreuzberg with excellent nightlife and restaurants. Perfect for creative professionals.',
    address: 'Warschauer Straße 12',
    city: 'Berlin',
    zipCode: '10243',
    state: 'Berlin',
    propertyType: 'loft',
    bedrooms: 1,
    bathrooms: 1,
    area: 75,
    rent: 1600,
    deposit: 3200,
    amenities: ['balcony', 'elevator'],
    photos: [
      'https://images.unsplash.com/photo-1549517045-bc93de075e53?w=800',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
    ],
    contactPhone: '+49 30 12345678',
    availableFrom: new Date('2024-02-15'),
    status: 'available'
  },
  {
    title: 'Student Room in WG',
    description: 'Bright room in friendly shared apartment. Great for students and young professionals. Shared kitchen and bathroom. Inclusive of all utilities and internet. Close to university.',
    address: 'Studentenstraße 99',
    city: 'Cologne',
    zipCode: '50937',
    state: 'North Rhine-Westphalia',
    propertyType: 'room',
    bedrooms: 1,
    bathrooms: 1,
    area: 20,
    rent: 480,
    deposit: 960,
    amenities: ['furnished'],
    photos: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
    ],
    contactPhone: '+49 221 55667788',
    availableFrom: new Date('2024-01-01'),
    status: 'available'
  }
];

// Demo conversations and messages
const demoConversations = [
  {
    apartment: null, // Will be set after apartment creation
    participants: [], // Will be set after user creation
    messages: [
      {
        sender: null, // Will be set to tenant
        recipient: null, // Will be set to landlord
        content: 'Hi! I\'m very interested in your apartment listing. Could we schedule a viewing?',
        messageType: 'text',
        isRead: true,
        timestamp: new Date('2024-01-10T10:00:00Z')
      },
      {
        sender: null, // Will be set to landlord
        recipient: null, // Will be set to tenant
        content: 'Hello Sarah! Thank you for your interest. I have availability this weekend. Would Saturday at 2 PM work for you?',
        messageType: 'text',
        isRead: true,
        timestamp: new Date('2024-01-10T14:30:00Z')
      },
      {
        sender: null, // Will be set to tenant
        recipient: null, // Will be set to landlord
        content: 'Perfect! Saturday at 2 PM works great. Should I bring any documents?',
        messageType: 'text',
        isRead: false,
        timestamp: new Date('2024-01-10T15:15:00Z')
      }
    ]
  }
];

async function seedDemoData() {
  try {
    console.log('🌱 Starting demo data seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await User.deleteMany({ email: { $regex: '@demo.com$' } });
    await Apartment.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});

    console.log('🗑️ Cleared existing demo data');

    // Create demo users
    const createdUsers = [];
    for (const userData of demoUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`👤 Created user: ${userData.name} (${userData.role})`);
    }

    // Create demo apartments (assign to landlords)
    const landlords = createdUsers.filter(user => user.role === 'landlord');
    const createdApartments = [];
    
    for (let i = 0; i < demoApartments.length; i++) {
      const apartmentData = demoApartments[i];
      const landlord = landlords[i % landlords.length]; // Distribute among landlords
      
      const apartment = new Apartment({
        ...apartmentData,
        landlord: landlord._id
      });
      
      const savedApartment = await apartment.save();
      createdApartments.push(savedApartment);
      console.log(`🏠 Created apartment: ${apartmentData.title}`);
    }

    // Create demo conversations and messages
    const tenants = createdUsers.filter(user => user.role === 'tenant');
    
    if (createdApartments.length > 0 && tenants.length > 0 && landlords.length > 0) {
      const apartment = createdApartments[0]; // Modern 2BR Apartment
      const landlord = landlords[0]; // Emma Schmidt
      const tenant = tenants[0]; // Sarah Johnson
      
      // Create conversation
      const conversation = new Conversation({
        apartment: apartment._id,
        participants: [landlord._id, tenant._id],
        lastMessage: null,
        lastActivity: new Date()
      });
      
      const savedConversation = await conversation.save();
      
      // Create messages
      const conversationData = demoConversations[0];
      const messages = [];
      
      for (let i = 0; i < conversationData.messages.length; i++) {
        const msgData = conversationData.messages[i];
        
        const message = new Message({
          conversation: savedConversation._id,
          sender: i % 2 === 0 ? tenant._id : landlord._id,
          recipient: i % 2 === 0 ? landlord._id : tenant._id,
          content: msgData.content,
          messageType: msgData.messageType,
          isRead: msgData.isRead,
          timestamp: msgData.timestamp
        });
        
        const savedMessage = await message.save();
        messages.push(savedMessage);
      }
      
      // Update conversation with last message
      savedConversation.lastMessage = messages[messages.length - 1]._id;
      savedConversation.messageCount = messages.length;
      await savedConversation.save();
      
      console.log(`💬 Created conversation with ${messages.length} messages`);
    }

    console.log('\n✅ Demo data seeding completed successfully!');
    console.log('\n📧 Demo Login Credentials:');
    console.log('Landlords:');
    console.log('  - sichrplace+emma@gmail.com / Demo123!');
    console.log('  - sichrplace+max@gmail.com / Demo123!');
    console.log('\nTenants:');
    console.log('  - sichrplace+sarah@gmail.com / Demo123!');
    console.log('  - sichrplace+david@gmail.com / Demo123!');
    console.log('  - sichrplace+lisa@gmail.com / Demo123!');
    console.log('\n🏠 Created Properties:', createdApartments.length);
    console.log('👥 Created Users:', createdUsers.length);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  }
}

module.exports = { seedDemoData };

// Allow running this script directly
if (require.main === module) {
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sichrplace';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('📦 Connected to MongoDB');
      return seedDemoData();
    })
    .then(() => {
      console.log('🎉 Demo data seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
