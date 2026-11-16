import { NextRequest, NextResponse } from 'next/server';
import WelfareFund from '@/lib/models/WelfareFund';
import WelfarePayment from '@/lib/models/WelfarePayment';
import WelfareCheckout from '@/lib/models/WelfareCheckout';
import { requireCommunityAdmin, readJson, routeError, logCommunityAction } from '@/lib/community/server';
import { hiddenAccountIds, privateActorProjection } from '@/lib/utils/account-visibility';
import { visiblePaymentMembers } from '@/lib/payments/people';
import { welfareFundSchema } from '@/lib/payments/policy';
import { welfarePaymentDirectory } from '@/lib/payments/welfare';

export async function GET() {
  try {
    const admin = await requireCommunityAdmin();
    const [people, funds, hidden] = await Promise.all([visiblePaymentMembers(), WelfareFund.find({}).sort({ createdAt: -1 }).lean(), hiddenAccountIds()]);
    const [payments, duplicates] = await Promise.all([WelfarePayment.find({ memberId: { $in: people.map(person => person.id) } }).sort({ submittedAt: -1, updatedAt: -1 }).lean(),
      WelfareCheckout.find({ status: 'Duplicate', memberId: { $in: people.map(person => person.id) } }).select('reference invoiceId memberId amountKobo paidAt').lean()]);
    const fundById = new Map(funds.map(fund => [fund._id.toString(), fund]));
    const peopleById = new Map(people.map(person => [person.id, person]));
    return NextResponse.json({ success: true, canReview: admin.role !== 'Verifier', funds: funds.map(fund => ({ ...fund,
      directory: welfarePaymentDirectory(people, payments.map(payment => ({ ...payment, memberId: payment.memberId.toString(), fundId: payment.fundId.toString() })), fund._id.toString(), fund.amountKobo) })),
      payments: payments.map(payment => ({ ...privateActorProjection(payment, hidden.adminIds), fundTitle: fundById.get(payment.fundId.toString())?.title || 'Archived welfare fund',
        memberName: peopleById.get(payment.memberId.toString())?.fullName || 'Name not supplied', memberEmail: peopleById.get(payment.memberId.toString())?.email || '' })),
      duplicates, members: people.map(({ id, fullName, email }) => ({ id, fullName, email })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin(true), input = welfareFundSchema.parse(await readJson(request));
    const fund = await WelfareFund.create(input);
    await logCommunityAction(admin, 'Created welfare payment fund', fund._id.toString(), `${input.title}; NGN ${input.amountKobo / 100}; active ${input.isActive}`);
    return NextResponse.json({ success: true, fund }, { status: 201 });
  } catch (error) { return routeError(error); }
}
