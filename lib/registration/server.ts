import type { HydratedDocument } from 'mongoose';
import Applicant, { type IApplicant } from '@/lib/models/Applicant';
import Member, { type IMember } from '@/lib/models/Member';
import { generateApplicationRef } from '@/lib/utils/reference-generator';
import { formatNigerianPhone } from '@/lib/utils/nigeria-data';
import type { CompleteRegistrationData } from '@/lib/validations/registration';
import { HttpError } from '@/lib/community/server';

export const FORM_FIELDS = ['fullName','dateOfBirth','gender','phoneNumber','whatsappNumber','email','residentialAddress','stateOfOrigin','lga','secondarySchool','graduationYear','positionHeldInSchool','currentOccupation','employmentType','organizationName','skills','willingToParticipate','contributionAreas','otherContributionArea','agreedToDeclaration','signature','signatureDate','referredBy'] as const;
export function formView(applicant: IApplicant, accountEmail: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of FORM_FIELDS) result[key] = applicant[key];
  result.email = accountEmail;
  result.dateOfBirth = new Date(applicant.dateOfBirth).toISOString().slice(0, 10);
  result.signatureDate = new Date(applicant.signatureDate).toISOString().slice(0, 10);
  result.graduationYear = String(applicant.graduationYear);
  return result;
}
export async function saveRegistration(member: HydratedDocument<IMember>, data: CompleteRegistrationData) {
  if (data.email.toLowerCase() !== member.email.toLowerCase()) throw new HttpError(400, 'Use the email linked to your signed-in account');
  const fields = {
    ...Object.fromEntries(FORM_FIELDS.map(key => [key, data[key]])),
    email: member.email, memberId: member._id, dateOfBirth: new Date(data.dateOfBirth), signatureDate: new Date(data.signatureDate),
    phoneNumber: formatNigerianPhone(data.phoneNumber), whatsappNumber: formatNigerianPhone(data.whatsappNumber), savedAt: new Date(),
  };
  let applicant: HydratedDocument<IApplicant> | null;
  if (member.applicantId) {
    // Link old registrations only through their existing account; never through body/email lookup.
    applicant = await Applicant.findOneAndUpdate({ _id: member.applicantId, email: member.email, $or: [{ memberId: member._id }, { memberId: { $exists: false } }] },
      { $set: fields }, { new: true, runValidators: true });
    if (!applicant) throw new HttpError(409, 'Your saved form could not be linked to this account. Contact the association.');
  } else {
    await Applicant.init();
    const existing = await Applicant.findOne({ memberId: member._id });
    const applicationRef = existing?.applicationRef || await generateApplicationRef();
    try {
      applicant = await Applicant.findOneAndUpdate({ memberId: member._id }, {
        $set: fields, $setOnInsert: { applicationRef, status: 'Saved', paymentStatus: 'unpaid' },
      }, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      applicant = await Applicant.findOneAndUpdate({ memberId: member._id }, { $set: fields }, { new: true, runValidators: true });
    }
    if (!applicant) throw new HttpError(500, 'Unable to save your registration form');
  }
  // A retry repairs this link if a previous response/write failed after saving the form.
  await Member.updateOne({ _id: member._id }, { $set: {
    profileComplete: true, applicantId: applicant._id, applicationRef: applicant.applicationRef, fullName: applicant.fullName, formDraft: null,
  } });
  return applicant;
}
