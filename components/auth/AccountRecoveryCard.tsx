import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AccountRecoveryCard({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ECEBE6] px-4 py-10 sm:py-16">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white bg-white shadow-xl shadow-[#173e2c]/5">
        <div className="flex items-center justify-between bg-[#173e2c] px-7 py-6 text-white">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-wide" aria-label="RSSSOSAA home">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-full bg-white object-contain p-1" />
            RSSSOSAA
          </Link>
          <LockKeyhole size={22} aria-hidden="true" className="text-emerald-200" />
        </div>
        <div className="px-7 py-8 sm:px-9">
          <h1 className="text-2xl font-bold tracking-tight text-[#121417]">{title}</h1>
          <p className="mb-7 mt-3 text-sm leading-6 text-neutral-500">{description}</p>
          {children}
          <Link href="/admin/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-[#173e2c] hover:underline">
            <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
