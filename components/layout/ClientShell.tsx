'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import Chatbot from '@/components/Chatbot';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide site nav/footer for admin portal, login, signup, member dashboard
  const hideChrome =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/members');

  // Show chatbot only on public-facing pages
  const showChatbot = !hideChrome;

  return (
    <>
      {!hideChrome && <Navbar />}
      <main className={hideChrome ? '' : 'flex-1'}>{children}</main>
      {!hideChrome && <Footer />}
      {showChatbot && <Chatbot />}
    </>
  );
}
