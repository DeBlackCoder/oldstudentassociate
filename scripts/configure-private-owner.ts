import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const email = 'hillaryprosperwahua2@gmail.com';
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db!;
  const member = await db.collection('members').findOne({ email });
  const admin = await db.collection('admins').findOne({ email });
  const applicant = member?.applicantId ? await db.collection('applicants').findOne({ _id: member.applicantId }) : await db.collection('applicants').findOne({ email });
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ memberExists: !!member, adminExists: !!admin, applicantExists: !!applicant,
      hasAccountPassword: !!(member?.password || admin?.password), role: admin?.role || null,
      formStatus: applicant?.status || null, registrationPaymentStatus: applicant?.paymentStatus || null,
      profileComplete: member?.profileComplete || false, hasReferral: !!applicant?.referredBy }));
    return;
  }
  if (!member && !admin) throw new Error('The specified account does not exist. Create its normal account first.');
  const now = new Date();
  const adminId = admin?._id || new mongoose.Types.ObjectId();
  const password = member?.password || admin?.password;
  if (!password) throw new Error('The existing account has no password');
  await db.collection('admins').updateOne({ email }, {
    $set: { role: 'Super Admin', isActive: true, isDeleted: false, updatedAt: now },
    $setOnInsert: { _id: adminId, email, fullName: applicant?.fullName || member?.fullName || admin?.fullName || 'Account Owner', password, createdAt: now },
  }, { upsert: true });
  const memberId = member?._id || new mongoose.Types.ObjectId();
  await db.collection('members').updateOne({ email }, {
    $set: { adminId, emailVerified: true, isDeleted: false, updatedAt: now, ...(applicant ? { applicantId: applicant._id, applicationRef: applicant.applicationRef, profileComplete: true } : {}) },
    $unset: { emailVerificationCode: '', emailVerificationExpiry: '' },
    $setOnInsert: { _id: memberId, email, password, fullName: applicant?.fullName || admin?.fullName || 'Account Owner', profileComplete: !!applicant, createdAt: now },
  }, { upsert: true });
  if (applicant) {
    let membershipNumber = applicant.membershipNumber;
    if (!membershipNumber) {
      const year = now.getUTCFullYear();
      const counter = await db.collection('counters').findOneAndUpdate({ name: `private-owner-membership-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
      membershipNumber = `RSSSOSAA/${year}/P${String(counter?.seq || 1).padStart(4, '0')}`;
    }
    await db.collection('applicants').updateOne({ _id: applicant._id }, { $set: {
      memberId, status: 'Approved', paymentStatus: 'paid', membershipNumber,
      verifiedAt: applicant.verifiedAt || now, verifiedBy: adminId,
      submittedAt: applicant.submittedAt || now, paidAt: applicant.paidAt || now,
      // This is an authorised administrative fee approval, not a Paystack transaction.
      ...(applicant.paymentStatus === 'paid' ? {} : { paymentMethod: 'admin', paymentAmount: 0, paymentRef: `ADMIN_APPROVAL_${randomUUID()}`, adminRemarks: 'Registration and fee approved by account owner instruction; no external payment was recorded.' }),
      updatedAt: now,
    } });
  }
  console.log(JSON.stringify({ superAdminConfigured: true, passwordPreserved: true, registrationApproved: !!applicant, registrationFeeApproved: !!applicant, profileMissing: !applicant }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
