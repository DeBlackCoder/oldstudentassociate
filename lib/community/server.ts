import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import AuditLog from '@/lib/models/AuditLog';
import { getAdminSession } from '@/lib/utils/auth';
import { getMemberSession } from '@/lib/utils/member-auth';
import { canEditContent } from './policy';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function assertId(id: string) { if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record ID'); }
export async function requireCommunityAdmin(write = false) {
  const session = await getAdminSession();
  if (!session || typeof session.adminId !== 'string' || !mongoose.isValidObjectId(session.adminId)) throw new HttpError(401, 'Sign in as an administrator');
  await connectDB();
  const admin = await Admin.findById(session.adminId).select('-password');
  if (!admin?.isActive || admin.isDeleted) throw new HttpError(401, 'Your administrator account is inactive');
  if (write && !canEditContent(admin.role)) throw new HttpError(403, 'Only Admin and Super Admin accounts can edit this section');
  return admin;
}
export async function requireCommunityMember() {
  const session = await getMemberSession();
  if (!session || session.role !== 'member' || !mongoose.isValidObjectId(session.memberId)) throw new HttpError(401, 'Sign in to your member account');
  await connectDB();
  const member = await Member.findById(session.memberId);
  if (!member?.emailVerified || member.isDeleted) throw new HttpError(401, 'A verified member account is required');
  return member;
}
export async function requireMinutesReader() {
  const memberSession = await getMemberSession();
  if (memberSession) return requireCommunityMember();
  return requireCommunityAdmin();
}
export async function readJson(request: Request) {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > 500_000) throw new HttpError(413, 'Content is too large. Maximum request size is 500 KB');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON request'); }
}
export function routeError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 });
  if ((error as { code?: number })?.code === 11000) return NextResponse.json({ error: 'You have already applied for this scholarship' }, { status: 409 });
  console.error('Community portal error:', error);
  return NextResponse.json({ error: 'Unable to complete this request. Please try again.' }, { status: 500 });
}
export async function logCommunityAction(admin: { _id: mongoose.Types.ObjectId; email: string }, action: string, targetId: string, details: string) {
  try { await AuditLog.create({ adminId: admin._id, adminName: admin.email, action, targetType: 'System', targetId, details }); }
  catch (error) { console.error('Community audit log failed:', error); }
}
