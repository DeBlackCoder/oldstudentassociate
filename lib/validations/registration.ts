import { z } from 'zod';
import { validateNigerianPhone } from '@/lib/utils/nigeria-data';

export const personalInfoSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters').max(100),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const age = (new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 15 && age <= 100;
  }, 'You must be at least 15 years old'),
  gender: z.enum(['Male', 'Female']),
  phoneNumber: z.string().refine(validateNigerianPhone, 'Invalid Nigerian phone number'),
  whatsappNumber: z.string().refine(validateNigerianPhone, 'Invalid Nigerian phone number'),
  email: z.string().email('Invalid email address'),
  residentialAddress: z.string().min(10, 'Address must be at least 10 characters'),
  stateOfOrigin: z.string().min(2, 'Please select your state of origin'),
  lga: z.string().min(2, 'Please select your LGA'),
  referredBy: z.string().trim().min(2, 'Please enter who referred you').max(100, 'Referral name must be at most 100 characters').optional().default(''),
});

export const schoolInfoSchema = z.object({
  secondarySchool: z.string().min(3, 'School name must be at least 3 characters'),
  graduationYear: z.union([z.number(), z.string()])
    .transform(val => typeof val === 'string' ? parseInt(val, 10) : val)
    .pipe(z.number()
      .min(1960, 'Year must be 1960 or later')
      .max(new Date().getFullYear(), 'Year cannot be in the future')),
  positionHeldInSchool: z.string().optional()
});

export const professionalInfoSchema = z.object({
  currentOccupation: z.string().min(2, 'Please enter your occupation'),
  employmentType: z.enum([
    'Public Service',
    'Private Employment',
    'Self Employed',
    'Business Owner',
    'Student',
    'Retired',
    'Unemployed',
    'Other'
  ]),
  organizationName: z.string().optional(),
  skills: z.array(z.string()).min(1, 'Please select at least one skill')
});

export const participationSchema = z.object({
  willingToParticipate: z.boolean(),
  contributionAreas: z.array(z.string()).optional(),
  otherContributionArea: z.string().optional()
});

export const declarationSchema = z.object({
  agreedToDeclaration: z.boolean().refine(val => val === true, {
    message: 'You must agree to the declaration'
  }),
  signature: z.string().min(2, 'Please provide your signature'),
  signatureDate: z.string().refine(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
    return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  }, 'Enter a valid declaration date')
});

export const completeRegistrationSchema = personalInfoSchema
  .merge(schoolInfoSchema)
  .merge(professionalInfoSchema)
  .merge(participationSchema)
  .merge(declarationSchema);

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type SchoolInfoFormData = z.infer<typeof schoolInfoSchema>;
export type ProfessionalInfoFormData = z.infer<typeof professionalInfoSchema>;
export type ParticipationFormData = z.infer<typeof participationSchema>;
export type DeclarationFormData = z.infer<typeof declarationSchema>;
export type CompleteRegistrationData = z.infer<typeof completeRegistrationSchema>;
