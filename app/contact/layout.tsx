import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the RSSSOSAA team. Send us a message and we will reply within two business days.',
  openGraph: {
    title: 'Contact RSSSOSAA',
    description:
      'Get in touch with the RSSSOSAA team. Send us a message and we will reply within two business days.',
    url: '/contact',
  },
  twitter: {
    title: 'Contact RSSSOSAA',
    description:
      'Get in touch with the RSSSOSAA team. Send us a message and we will reply within two business days.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
