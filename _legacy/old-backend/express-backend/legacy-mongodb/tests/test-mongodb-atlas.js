// MongoDB Atlas Connection Test for SichrPlace
// This script tests the MongoDB Atlas connection and shows database info

require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoConnection() {
  try {
    console.log('🧪 Testing MongoDB Atlas Connection...');
    console.log('📍 Cluster: SichrPlace');
    console.log('👤 Username: sichrplace');
    console.log('🏷️  Environment: test');
    console.log('');

    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔗 Connecting to:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });

    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Get database info
    const db = mongoose.connection.db;
    const admin = db.admin();
    
    // Test database operations
    console.log('');
    console.log('📊 Database Information:');
    console.log('🏷️  Database Name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections:', collections.length > 0 ? collections.map(c => c.name).join(', ') : 'No collections yet');
    
    // Test a simple operation
    console.log('');
    console.log('🧪 Testing database operations...');
    
    // Create a test collection and document
    const testCollection = db.collection('connection_test');
    const testDoc = {
      timestamp: new Date(),
      test: 'SichrPlace MongoDB Atlas Connection Test',
      environment: 'development',
      cluster: 'SichrPlace'
    };
    
    const result = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted with ID:', result.insertedId);
    
    // Read the test document back
    const retrievedDoc = await testCollection.findOne({ _id: result.insertedId });
    console.log('✅ Test document retrieved:', retrievedDoc.test);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Test document cleaned up');
    
    console.log('');
    console.log('🎉 MongoDB Atlas connection test completed successfully!');
    console.log('✅ Your SichrPlace application can now use database features:');
    console.log('   • User authentication and registration');
    console.log('   • Viewing request management with PayPal integration');
    console.log('   • GDPR compliance tracking');
    console.log('   • Chat/messaging system');
    console.log('   • Apartment listings and management');
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection test failed:');
    console.error('Error:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('');
      console.log('🔧 Troubleshooting suggestions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify IP address is whitelisted in Atlas (5.199.242.52/32)');
      console.log('3. Confirm username/password are correct');
      console.log('4. Check cluster is running and accessible');
    }
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the test
testMongoConnection();
