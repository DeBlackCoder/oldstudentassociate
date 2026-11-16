import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import PaymentSettings from '@/lib/models/PaymentSettings';
import { requireCommunityAdmin, readJson, routeError, logCommunityAction } from '@/lib/community/server';
import { paymentSettings } from '@/lib/payments/settings';

export async function GET() {
  try { const admin = await requireCommunityAdmin(); return NextResponse.json({ success: true, settings: await paymentSettings(), canEdit: admin.role !== 'Verifier' }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return routeError(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin(true);
    const input = z.object({ quarterlyDuesKobo: z.number().int().min(1).max(1_000_000_000), note: z.string().trim().min(3).max(2000) }).strict().parse(await readJson(request));
    const before = await paymentSettings();
    await PaymentSettings.findOneAndUpdate({ key: 'association' }, { $set: { quarterlyDuesKobo: input.quarterlyDuesKobo } }, { upsert: true, new: true, runValidators: true });
    await logCommunityAction(admin, 'Changed quarterly dues price', 'association', `NGN ${before.quarterlyDuesKobo / 100} -> NGN ${input.quarterlyDuesKobo / 100}; applies to new invoices; ${input.note}`);
    return NextResponse.json({ success: true, settings: { quarterlyDuesKobo: input.quarterlyDuesKobo }, message: 'New invoices use this price. Existing invoices and checkout receipts keep their original price.' });
  } catch (error) { return routeError(error); }
}
