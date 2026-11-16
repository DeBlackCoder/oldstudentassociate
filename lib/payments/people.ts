import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';
import type { DirectoryMember } from './directory';

export async function visiblePaymentMembers() {
  const members = await Member.find({ emailVerified: true, ...visibleAccountFilter }).select('fullName email applicantId createdAt').lean();
  const applicants = await Applicant.find({ ...visibleAccountFilter, _id: { $in: members.map(m => m.applicantId).filter(Boolean) } })
    .select('fullName membershipNumber secondarySchool paymentStatus').lean();
  const profiles = new Map(applicants.map(a => [a._id.toString(), a]));
  const people: (DirectoryMember & { email: string })[] = members.map(member => {
    const applicant = member.applicantId ? profiles.get(member.applicantId.toString()) : undefined;
    return { id: member._id.toString(), email: member.email, fullName: applicant?.fullName || member.fullName || 'Name not supplied',
      membershipNumber: applicant?.membershipNumber, secondarySchool: applicant?.secondarySchool,
      createdAt: member.createdAt, registrationPaid: applicant?.paymentStatus === 'paid' };
  });
  return people;
}
