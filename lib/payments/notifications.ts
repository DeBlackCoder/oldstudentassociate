import type { IApplicant } from '@/lib/models/Applicant';
/** Called only by the request that first confirms the payment. */
export async function notifyMembershipPayment(applicant: IApplicant): Promise<boolean> {
  try {
    const {
      notifyAdminPaymentReceived, sendApplicationConfirmation, sendPaymentClaimConfirmedEmail, notifyAdminNewRegistration,
    } = await import('@/lib/utils/email');
    const Notification = (await import('@/lib/models/Notification')).default;
    const memberEmail = applicant.paymentClaimStatus === 'confirmed' && applicant.paymentMethod === 'admin'
      ? sendPaymentClaimConfirmedEmail(applicant.email, applicant.fullName, applicant.applicationRef)
      : sendApplicationConfirmation(applicant.email, applicant.fullName, applicant.applicationRef);
    const results = await Promise.allSettled([
      notifyAdminPaymentReceived({ fullName: applicant.fullName, email: applicant.email, applicationRef: applicant.applicationRef, paymentRef: applicant.paymentRef || '', paymentAmount: applicant.paymentAmount || 0 }),
      Notification.create({ type: 'payment_received', title: 'Payment Received', message: `${applicant.fullName} paid the membership fee`, link: '/admin/dashboard/applications' }),
      memberEmail,
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
    results.forEach((result, index) => {
      if (result.status === 'rejected') console.error(`Membership payment notification ${index + 1} could not be delivered:`, result.reason);
    });
    return results[2].status === 'fulfilled';
  } catch (error) {
    console.error('Membership payment notification could not be delivered:', error);
    return false;
  }
}

export async function notifyPaymentClaimRejected(applicant: IApplicant, reason: string) {
  try {
    const { sendPaymentClaimRejectedEmail } = await import('@/lib/utils/email');
    await sendPaymentClaimRejectedEmail(applicant.email, applicant.fullName, applicant.applicationRef, reason);
    return true;
  } catch (error) {
    console.error('In-person payment rejection notification failed:', error);
    return false;
  }
}
