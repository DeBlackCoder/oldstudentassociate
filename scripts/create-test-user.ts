import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Member from '../lib/models/Member';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rsssosaa';

async function createTestUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'testuser@rsssosaa.org';

    // Remove existing test user if any
    await Member.deleteOne({ email });

    const hashedPassword = await bcrypt.hash('testuser123', 10);

    await Member.create({
      email,
      password: hashedPassword,
      emailVerified: true,       // email confirmed, no form filled
      profileComplete: false,
      createdAt: new Date(),
    });

    console.log('✓ Test user created');
    console.log('  Email:    testuser@rsssosaa.org');
    console.log('  Password: testuser123');
    console.log('  State:    email verified, no registration form filled');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
