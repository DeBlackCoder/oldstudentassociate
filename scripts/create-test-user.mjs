import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Read MONGODB_URI from .env.local
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const mongoLine = envContent.split('\n').find(l => l.startsWith('MONGODB_URI='));
const MONGODB_URI = mongoLine ? mongoLine.replace('MONGODB_URI=', '').trim() : '';

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Inline Member schema to avoid TS import issues
const MemberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  profileComplete: { type: Boolean, default: false },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant' },
  applicationRef: { type: String },
  fullName: { type: String },
  formDraft: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

async function createTestUser() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const email = 'testuser@rsssosaa.org';
    await Member.deleteOne({ email });

    const hashedPassword = await bcrypt.hash('testuser123', 10);
    await Member.create({
      email,
      password: hashedPassword,
      emailVerified: true,
      profileComplete: false,
    });

    console.log('\n✓ Test user created successfully');
    console.log('  Email:    testuser@rsssosaa.org');
    console.log('  Password: testuser123');
    console.log('  State:    email verified only, no registration form filled\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
