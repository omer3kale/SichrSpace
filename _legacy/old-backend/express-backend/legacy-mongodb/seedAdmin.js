const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest';

async function seedAdmin() {
  await mongoose.connect(MONGO_URI, {});
  const existing = await User.findOne({ email: 'sichrplace@gmail.com' });
  if (!existing) {
    const admin = new User({
      username: 'sichrplace',
      email: 'sichrplace@gmail.com',
      password: 'Gokhangulec29*',
      role: 'admin'
    });
    await admin.save();
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists.');
  }
  await mongoose.connection.close();
}

seedAdmin();