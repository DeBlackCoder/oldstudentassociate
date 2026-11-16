export async function paymentResponse<T>(response: Response): Promise<T> {
  let result: Record<string, unknown>;
  try { result = await response.json(); }
  catch { throw new Error('Payment records are temporarily unavailable. Please try again.'); }
  if (!response.ok || result?.success !== true) {
    throw new Error(typeof result?.error === 'string' ? result.error : typeof result?.message === 'string' ? result.message : 'Unable to complete this request. Please try again.');
  }
  return result as T;
}

export function openPaystack(authorizationUrl: string) {
  const checkout = new URL(authorizationUrl);
  if (checkout.protocol !== 'https:' || !(checkout.hostname === 'paystack.com' || checkout.hostname.endsWith('.paystack.com'))) {
    throw new Error('The payment provider returned an invalid checkout link. Please contact support.');
  }
  window.location.assign(checkout.toString());
}

export function todayInNigeria() {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}
