import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = session.role === 'Super Admin';
    if (!isSuperAdmin && session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();
    const parameters = request.nextUrl.searchParams;
    const page = Math.min(100000, Math.max(1, Number.parseInt(parameters.get('page') || '1', 10) || 1));
    const limit = 30;
    const search = (parameters.get('search') || '').trim().slice(0, 150);
    const expression = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const superAdmins = isSuperAdmin ? [] : await Admin.find({ ...visibleAccountFilter, role: 'Super Admin' }).select('_id email').lean();
    const filter = {
      ...visibleAccountFilter,
      ...(!isSuperAdmin && superAdmins.length ? {
        $nor: [
          { adminId: { $in: superAdmins.map(admin => admin._id) } },
          { email: { $in: superAdmins.map(admin => admin.email) } },
        ],
      } : {}),
      ...(search ? { $or: [{ email: { $regex: expression, $options: 'i' } }, { fullName: { $regex: expression, $options: 'i' } }] } : {}),
    };
    const [members, total] = await Promise.all([
      Member.find(filter).select('_id email fullName emailVerified profileComplete applicantId applicationRef adminId createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Member.countDocuments(filter),
    ]);
    const [admins, applicants] = await Promise.all([
      Admin.find({ ...visibleAccountFilter, ...(!isSuperAdmin ? { role: { $ne: 'Super Admin' as const } } : {}), $or: [{ _id: { $in: members.flatMap(member => member.adminId ? [member.adminId] : []) } }, { email: { $in: members.map(member => member.email) } }] }).select('_id email role isActive').lean(),
      Applicant.find({ ...visibleAccountFilter, _id: { $in: members.flatMap(member => member.applicantId ? [member.applicantId] : []) } }).select('_id fullName status paymentStatus membershipNumber').lean(),
    ]);
    const accounts = members.map(member => {
      const admin = admins.find(staff => member.adminId ? staff._id.toString() === member.adminId.toString() : staff.email === member.email);
      const application = applicants.find(applicant => applicant._id.toString() === member.applicantId?.toString());
      return { id: member._id.toString(), email: member.email, fullName: member.fullName || application?.fullName || 'Profile not completed', emailVerified: member.emailVerified, profileComplete: member.profileComplete, createdAt: member.createdAt,
        applicationRef: member.applicationRef, applicationStatus: application?.status || 'No form', registrationPaymentStatus: application?.paymentStatus || 'unpaid', membershipNumber: application?.membershipNumber,
        admin: admin ? { id: admin._id.toString(), role: admin.role, isActive: admin.isActive } : null, canDelete: admin?._id.toString() !== session.adminId };
    });
    return NextResponse.json({ success: true, accounts, total, page, pages: Math.max(1, Math.ceil(total / limit)), canManageAccounts: isSuperAdmin });
  } catch (error) {
    console.error('Account list error:', error);
    return NextResponse.json({ error: 'Unable to load accounts' }, { status: 500 });
  }
}
