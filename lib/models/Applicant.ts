import mongoose, { Schema, models, Model } from 'mongoose';

export interface IApplicant {
  memberId?: mongoose.Types.ObjectId;
  // Personal Information
  fullName: string;
  dateOfBirth: Date;
  gender: 'Male' | 'Female';
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  residentialAddress: string;
  stateOfOrigin: string;
  lga: string;

  // School Information
  secondarySchool: string;
  graduationYear: number;
  positionHeldInSchool?: string;

  // Current Information
  currentOccupation: string;
  employmentType: 'Public Service' | 'Private Employment' | 'Self Employed' | 'Business Owner' | 'Student' | 'Retired' | 'Unemployed' | 'Other';
  organizationName?: string;
  skills: string[];

  // Participation
  willingToParticipate: boolean;
  contributionAreas: string[];
  otherContributionArea?: string;

  // Declaration
  agreedToDeclaration: boolean;
  signature: string;
  signatureDate: Date;

  // Payment
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  paymentRef?: string;
  paymentAmount?: number;
  paymentExpectedAmount?: number;
  paymentMethod?: 'paystack' | 'bank' | 'admin';
  paidAt?: Date;

  // Application Status
  applicationRef: string;
  status: 'Saved' | 'Pending' | 'Approved' | 'Rejected';
  savedAt?: Date;
  membershipNumber?: string;
  adminRemarks?: string;
  
  // Metadata
  submittedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  referredBy?: string;
}

const ApplicantSchema = new Schema<IApplicant>({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', unique: true, sparse: true },
  // Personal Information
  fullName: { type: String, required: true, index: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  phoneNumber: { type: String, required: true, index: true },
  whatsappNumber: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, index: true },
  residentialAddress: { type: String, required: true },
  stateOfOrigin: { type: String, required: true },
  lga: { type: String, required: true, index: true },

  // School Information
  secondarySchool: { type: String, required: true, index: true },
  graduationYear: { type: Number, required: true, index: true },
  positionHeldInSchool: { type: String },

  // Current Information
  currentOccupation: { type: String, required: true },
  employmentType: { 
    type: String, 
    enum: ['Public Service', 'Private Employment', 'Self Employed', 'Business Owner', 'Student', 'Retired', 'Unemployed', 'Other'],
    required: true,
    index: true
  },
  organizationName: { type: String },
  skills: [{ type: String }],

  // Participation
  willingToParticipate: { type: Boolean, required: true },
  contributionAreas: [{ type: String }],
  otherContributionArea: { type: String },

  // Declaration
  agreedToDeclaration: { type: Boolean, required: true },
  signature: { type: String, required: true },
  signatureDate: { type: Date, required: true },

  // Payment
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid', index: true },
  paymentRef: { type: String, sparse: true },
  paymentAmount: { type: Number },
  paymentExpectedAmount: { type: Number },
  paymentMethod: { type: String, enum: ['paystack', 'bank', 'admin'] },
  paidAt: { type: Date },

  // Application Status
  applicationRef: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['Saved', 'Pending', 'Approved', 'Rejected'], default: 'Saved', index: true },
  savedAt: { type: Date },
  membershipNumber: { type: String, unique: true, sparse: true, index: true },
  adminRemarks: { type: String },

  // Metadata
  submittedAt: { type: Date, index: true },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  referredBy: { type: String },
}, {
  timestamps: true
});

const Applicant: Model<IApplicant> = models.Applicant || mongoose.model<IApplicant>('Applicant', ApplicantSchema);

export default Applicant;
