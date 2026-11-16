import { redirect } from 'next/navigation';
import { getMemberSession } from '@/lib/utils/member-auth';
import { getAdminSession } from '@/lib/utils/auth';
import Link from 'next/link';
import ContentHub from '@/components/community/ContentHub';
export default async function Page() {
  const session = await getMemberSession();
  if (!session && !await getAdminSession()) redirect('/login');
  return <div className="min-h-screen bg-[#ECEBE6] px-4 py-12"><div className="mx-auto mb-6 max-w-5xl"><Link href={session ? '/members/dashboard?tab=minutes' : '/admin/dashboard/minutes'} className="font-semibold text-[#173f26] underline">Back to dashboard</Link></div><ContentHub initialKind="minutes" memberView showTabs={false} /></div>;
}
