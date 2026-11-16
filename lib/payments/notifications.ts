import type { IApplicant } from '@/lib/models/Applicant';
/** Called only by the request that first confirms the payment. */
export async function notifyMembershipPayment(applicant: IApplicant) {
  try {
    const { notifyAdminPaymentReceived, sendApplicationConfirmation, notifyAdminNewRegistration } = await import('@/lib/utils/email');
    const Notification = (await import('@/lib/models/Notification')).default;
    await Promise.all([
      notifyAdminPaymentReceived({ fullName: applicant.fullName, email: applicant.email, applicationRef: applicant.applicationRef, paymentRef: applicant.paymentRef || '', paymentAmount: applicant.paymentAmount || 0 }),
      Notification.create({ type: 'payment_received', title: 'Payment Received', message: `${applicant.fullName} paid the membership fee`, link: '/admin/dashboard/applications' }),
      sendApplicationConfirmation(applicant.email, applicant.fullName, applicant.applicationRef),
      notifyAdminNewRegistration({
        fullName: applicant.fullName, email: applicant.email, phoneNumber: applicant.phoneNumber, whatsappNumber: applicant.whatsappNumber,
        dateOfBirth: new Date(applicant.dateOfBirth).toLocaleDateString('en-GB'), gender: applicant.gender,
        residentialAddress: applicant.residentialAddress, stateOfOrigin: applicant.stateOfOrigin, lga: applicant.lga,
        secondarySchool: applicant.secondarySchool, graduationYear: applicant.graduationYear, positionHeldInSchool: applicant.positionHeldInSchool,
        currentOccupation: applicant.currentOccupation, employmentType: applicant.employmentType, organizationName: applicant.organizationName,
        skills: applicant.skills || [], willingToParticipate: applicant.willingToParticipate, contributionAreas: applicant.contributionAreas || [],
        applicationRef: applicant.applicationRef, submittedAt: applicant.submittedAt || new Date(),
      }),
      Notification.create({ type: 'new_registration', title: 'Paid Application Submitted', message: `${applicant.fullName}'s saved form was automatically submitted after registration payment`, link: '/admin/dashboard/applications' }),
    ]);
  } catch { console.error('Membership payment notification could not be delivered'); }
}
