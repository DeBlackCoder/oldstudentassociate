import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Applicant from '@/lib/models/Applicant';
import Member from '@/lib/models/Member';
import { requireCommunityMember, readJson, routeError, HttpError } from '@/lib/community/server';
import { FORM_FIELDS, formView } from '@/lib/registration/server';
import { applicationStatusForMember, registrationFeeKobo } from '@/lib/registration/policy';

export async function GET() {
  try {
    const member = await requireCommunityMember();
    const applicant = member.applicantId ? await Applicant.findById(member.applicantId) : null;
    if (member.profileComplete && !applicant) throw new HttpError(409, 'Your saved form could not be found. Contact the association.');
    if (applicant && (applicant.email !== member.email || applicant.memberId && applicant.memberId.toString() !== member._id.toString())) throw new HttpError(409, 'Your registration form is not linked to this account. Contact the association.');
    return NextResponse.json({ success: true, email: member.email,
      draft: applicant && member.profileComplete ? formView(applicant, member.email) : member.formDraft ? { ...member.formDraft, email: member.email } : { email: member.email },
      profileComplete: member.profileComplete, applicationRef: applicant?.applicationRef || member.applicationRef || null,
      applicationStatus: applicationStatusForMember(applicant), paymentStatus: applicant?.paymentStatus || 'unpaid', registrationFeeKobo: registrationFeeKobo(),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
const partialDraft = z.object({ formData: z.record(z.string(), z.unknown()), step: z.number().int().min(1).max(6).optional() }).strict();
export async function POST(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    if (member.profileComplete) return NextResponse.json({ success: true, message: 'Your completed form is saved. Use Save changes to update it.' });
    const body = partialDraft.parse(await readJson(request));
    const draft: Record<string, unknown> = {};
    for (const key of FORM_FIELDS) {
      const value = body.formData[key];
      if (typeof value === 'string' && value.length <= 10_000 || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || Array.isArray(value) && value.length <= 100 && value.every(v => typeof v === 'string' && v.length <= 1000)) draft[key] = value;
    }
    draft.email = member.email;
    const step = body.step || body.formData.step;
    if (typeof step === 'number' && Number.isInteger(step) && step >= 1 && step <= 6) draft.step = step;
    await Member.updateOne({ _id: member._id, profileComplete: false }, { $set: { formDraft: draft } });
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); }
}
