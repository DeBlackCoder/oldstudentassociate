export type DuesStatus = 'Unpaid' | 'Pending' | 'Paid' | 'Rejected';

export interface DuesInvoice {
  _id: string;
  year: number;
  quarter: number;
  amountKobo: number;
  status: DuesStatus;
  paymentMethod?: 'paystack' | 'bank';
  paidAt?: string;
  adminNote?: string;
  bankReference?: string;
}

export interface PaymentDirectoryEntry {
  id: string;
  fullName: string;
  membershipNumber?: string;
  secondarySchool?: string;
  status: DuesStatus;
  paidQuarters: number[];
  dueQuarters: number[];
  notYetDue: boolean;
  duesPaymentCount: number;
  registrationPaymentCount: number;
  eventPaymentCount: number;
  totalPaymentCount: number;
}

export interface WelfareDirectoryEntry {
  id: string;
  fullName: string;
  contributionCount: number;
  totalAmount: number;
  benefitCount: number;
  isMember: boolean;
}

export interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface MemberDuesResponse {
  success: boolean;
  amountKobo: number;
  annualAmountKobo: number;
  year: number;
  currentQuarter: number;
  availableYears: number[];
  dues: DuesInvoice[];
  directory: PaymentDirectoryEntry[];
  welfare: WelfareDirectoryEntry[];
  bankAccount: BankAccount | null;
}

export interface AdminDuesInvoice extends DuesInvoice {
  memberName: string;
  memberEmail: string;
  senderName?: string;
  transferDate?: string;
  createdAt?: string;
}

export interface WelfarePayment extends Omit<DuesInvoice, 'year' | 'quarter'> {
  fundId?: string;
  memberId?: string;
  fundTitle?: string;
  memberName?: string;
  memberEmail?: string;
  senderName?: string;
  transferDate?: string;
}

export interface WelfarePaymentMember {
  id: string;
  fullName: string;
  membershipNumber?: string;
  status: DuesStatus;
  amountKobo: number;
  welfarePaymentCount: number;
  totalAmountKobo: number;
}

export interface WelfareFund {
  _id: string;
  title: string;
  description: string;
  amountKobo: number;
  isActive: boolean;
  createdAt: string;
  ownPayment?: WelfarePayment;
  directory?: WelfarePaymentMember[];
}

export interface AdminPaymentMember {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminPaymentDirectoryEntry extends PaymentDirectoryEntry {
  periods: DuesInvoice[];
}

export function formatNaira(amount: number, inKobo = false): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(inKobo ? amount / 100 : amount);
}

export function displayPaymentDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(date);
}

export function quarterLabel(quarter: number): string {
  return ['January – March', 'April – June', 'July – September', 'October – December'][quarter - 1] || `Quarter ${quarter}`;
}
