import PaymentSettings from '@/lib/models/PaymentSettings';
import { QUARTERLY_DUES_KOBO } from './policy';

export async function paymentSettings() {
  const settings = await PaymentSettings.findOne({ key: 'association' }).lean();
  return { quarterlyDuesKobo: settings?.quarterlyDuesKobo || QUARTERLY_DUES_KOBO };
}
