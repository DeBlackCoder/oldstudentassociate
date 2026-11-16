import { NextRequest, NextResponse } from 'next/server';
import WelfareFund from '@/lib/models/WelfareFund';
import { requireCommunityAdmin, readJson, assertId, HttpError, routeError, logCommunityAction } from '@/lib/community/server';
import { welfareFundSchema } from '@/lib/payments/policy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireCommunityAdmin(true), { id } = await params;
    assertId(id);
    const input = welfareFundSchema.parse(await readJson(request));
    const fund = await WelfareFund.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
    if (!fund) throw new HttpError(404, 'Welfare fund not found');
    await logCommunityAction(admin, 'Updated welfare payment fund', id, `${input.title}; NGN ${input.amountKobo / 100}; active ${input.isActive}; existing invoices keep their price`);
    return NextResponse.json({ success: true, fund });
  } catch (error) { return routeError(error); }
}
