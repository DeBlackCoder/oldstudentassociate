import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import Member from '@/lib/models/Member';
import { generateApplicationRef } from '@/lib/utils/reference-generator';
import { formatNigerianPhone } from '@/lib/utils/nigeria-data';
import { completeRegistrationSchema } from '@/lib/validations/registration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = completeRegistrationSchema.parse(body);

    // Connect to database
    await connectDB();

    // Generate application reference
    const applicationRef = await generateApplicationRef();

    // Create applicant
    const applicant = await Applicant.create({
      fullName: validatedData.fullName,
      dateOfBirth: new Date(validatedData.dateOfBirth),
      gender: validatedData.gender,
      phoneNumber: formatNigerianPhone(validatedData.phoneNumber),
      whatsappNumber: formatNigerianPhone(validatedData.whatsappNumber),
      email: validatedData.email.toLowerCase(),
      residentialAddress: validatedData.residentialAddress,
      stateOfOrigin: validatedData.stateOfOrigin,
      lga: validatedData.lga,
      secondarySchool: validatedData.secondarySchool,
      graduationYear: parseInt(validatedData.graduationYear as any),
      positionHeldInSchool: validatedData.positionHeldInSchool,
      currentOccupation: validatedData.currentOccupation,
      employmentType: validatedData.employmentType,
      organizationName: validatedData.organizationName,
      skills: validatedData.skills,
      willingToParticipate: validatedData.willingToParticipate,
      contributionAreas: validatedData.contributionAreas || [],
      otherContributionArea: validatedData.otherContributionArea,
      agreedToDeclaration: validatedData.agreedToDeclaration,
      signature: validatedData.signature,
      signatureDate: new Date(validatedData.signatureDate),
      applicationRef,
      status: 'Pending',
      submittedAt: new Date(),
      referredBy: validatedData.referredBy || undefined,
    });

    // Send confirmation email and notify admin (non-blocking)
    // Link member account to applicant
    try {
      await Member.findOneAndUpdate(
        { email: validatedData.email.toLowerCase() },
        {
          profileComplete: true,
          applicantId: applicant._id,
          applicationRef: applicant.applicationRef,
          fullName: applicant.fullName,
          formDraft: null,
        }
      );
    } catch (memberUpdateErr) {
      console.error('Failed to update member:', memberUpdateErr);
    }

    // Send confirmation email and notify admin (non-blocking)
    try {
      const { sendApplicationConfirmation, notifyAdminNewRegistration } = await import('@/lib/utils/email');
      const Notification = (await import('@/lib/models/Notification')).default;
      await Promise.all([
        sendApplicationConfirmation(applicant.email, applicant.fullName, applicant.applicationRef),
        notifyAdminNewRegistration({
          fullName: applicant.fullName,
          email: applicant.email,
          phoneNumber: applicant.phoneNumber,
          whatsappNumber: applicant.whatsappNumber,
          dateOfBirth: new Date(applicant.dateOfBirth).toLocaleDateString('en-GB'),
          gender: applicant.gender,
          residentialAddress: applicant.residentialAddress,
          stateOfOrigin: applicant.stateOfOrigin,
          lga: applicant.lga,
          secondarySchool: applicant.secondarySchool,
          graduationYear: applicant.graduationYear,
          positionHeldInSchool: applicant.positionHeldInSchool,
          currentOccupation: applicant.currentOccupation,
          employmentType: applicant.employmentType,
          organizationName: applicant.organizationName,
          skills: applicant.skills || [],
          willingToParticipate: applicant.willingToParticipate,
          contributionAreas: applicant.contributionAreas || [],
          applicationRef: applicant.applicationRef,
          submittedAt: applicant.submittedAt,
        }),
        Notification.create({
          type: 'new_registration',
          title: 'New Registration',
          message: `${applicant.fullName} submitted a membership application`,
          link: `/admin/dashboard/applications`,
        }),
      ]);
    } catch (emailErr) {
      console.error('Failed to send emails:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationRef: applicant.applicationRef,
      applicantId: applicant._id
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid form data. Please check all fields and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
