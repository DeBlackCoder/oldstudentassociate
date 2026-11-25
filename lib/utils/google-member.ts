import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';

export interface GoogleMemberIdentity {
  googleId: string;
  email: string;
  name?: string | null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

async function linkGoogleIdentity(
  member: InstanceType<typeof Member>,
  identity: GoogleMemberIdentity,
) {
  if (member.isDeleted) throw new Error('Deleted accounts cannot sign in.');
  if (member.googleId && member.googleId !== identity.googleId) {
    throw new Error('This account is linked to a different Google account.');
  }

  let changed = false;
  if (!member.googleId) {
    member.googleId = identity.googleId;
    changed = true;
  }
  if (!member.emailVerified) {
    member.emailVerified = true;
    member.emailVerificationCode = undefined;
    member.emailVerificationExpiry = undefined;
    changed = true;
  }
  if (!member.fullName && identity.name?.trim()) {
    member.fullName = identity.name.trim().slice(0, 100);
    changed = true;
  }
  if (changed) await member.save();
  return member;
}

export async function ensureGoogleMember(identity: GoogleMemberIdentity) {
  const googleId = identity.googleId.trim();
  const email = identity.email.trim().toLowerCase();
  if (!googleId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Google did not provide a valid verified identity.');
  }

  await connectDB();

  const linked = await Member.findOne({ googleId });
  if (linked) return linkGoogleIdentity(linked, { ...identity, googleId, email });

  const existing = await Member.findOne({ email });
  if (existing) return linkGoogleIdentity(existing, { ...identity, googleId, email });

  const password = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
  try {
    return await Member.create({
      email,
      password,
      googleId,
      fullName: identity.name?.trim().slice(0, 100) || undefined,
      emailVerified: true,
      profileComplete: false,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const racedMember = await Member.findOne({ googleId }) || await Member.findOne({ email });
    if (!racedMember) throw error;
    return linkGoogleIdentity(racedMember, { ...identity, googleId, email });
  }
}
