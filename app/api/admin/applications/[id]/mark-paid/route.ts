import { NextRequest, NextResponse } from 'next/server';
import Applicant from '@/lib/models/Applicant';
import { z } from 'zod';
import { requireCommunityAdmin, readJson, assertId, HttpError, routeError, logCommunityAction } from '@/lib/community/server';
import { submissionFieldsOnPayment, registrationFeeKobo } from '@/lib/registration/policy';
import { notifyMembershipPayment } from '@/lib/payments/notifications';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireCommunityAdmin(true), { id } = await params;
    assertId(id);
    const { remarks } = z.object({ remarks: z.string().trim().max(2000).optional() }).strict().parse(await readJson(request));
    const application = await Applicant.findById(id);
    if (!application || isHiddenAccount(application.email)) throw new HttpError(404, 'Saved registration form not found');
    if (application.paymentStatus === 'paid') throw new HttpError(409, 'Registration payment is already confirmed');
    const now = new Date();
    const updated = await Applicant.findOneAndUpdate({ _id: application._id, paymentStatus: { $ne: 'paid' } }, { $set: {
      ...submissionFieldsOnPayment(application, now), paymentStatus: 'paid', paymentMethod: 'bank',
      paymentRef: `BANK-TRANSFER-${application._id}-${now.getTime()}`, paymentAmount: application.paymentExpectedAmount || registrationFeeKobo(), paidAt: now,
      ...(remarks ? { adminRemarks: remarks } : {}),
    } }, { new: true, runValidators: true });
    if (!updated) throw new HttpError(409, 'This registration payment has already been confirmed');
    await logCommunityAction(admin, 'Confirmed registration bank transfer', id, `Reference ${updated.applicationRef}; NGN ${(updated.paymentAmount || 0) / 100}; saved form submitted automatically. ${remarks || ''}`);
    await notifyMembershipPayment(updated);
    return NextResponse.json({ success: true, message: 'Registration payment confirmed. The saved form has been submitted automatically for review.' });
  } catch (error) { return routeError(error); }
}
