import mongoose from 'mongoose';
import Admin from '../lib/models/Admin';
import { hashPassword } from '../lib/utils/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rsssosaa';

async function setupAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@rsssosaa.org' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await hashPassword('admin123456');
    
    await Admin.create({
      fullName: 'System Administrator',
      email: 'admin@rsssosaa.org',
      password: hashedPassword,
      role: 'Super Admin',
      isActive: true
    });

    console.log('✓ Admin user created successfully');
    console.log('Email: admin@rsssosaa.org');
    console.log('Password: admin123456');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

setupAdmin();
