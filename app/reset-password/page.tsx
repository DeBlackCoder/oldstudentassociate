import type { Metadata } from 'next';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password', robots: { index: false, follow: false }, referrer: 'no-referrer',
};

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === 'string' ? token : ''} />;
}
