import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClientShell } from "@/components/layout/ClientShell";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rsssosaa.org';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'RSSSOSAA — Rivers State Secondary Schools Old Students Association',
    template: '%s | RSSSOSAA',
  },
  description:
    'The official member portal for the Rivers State Secondary Schools Old Students Association. Register, connect, and engage with alumni across Rivers State.',
  keywords: [
    'RSSSOSAA', 'Rivers State', 'old students', 'alumni', 'secondary schools',
    'Port Harcourt', 'association', 'membership',
  ],
  authors: [{ name: 'RSSSOSAA', url: APP_URL }],
  creator: 'RSSSOSAA',
  publisher: 'RSSSOSAA',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: APP_URL,
    siteName: 'RSSSOSAA',
    title: 'RSSSOSAA — Rivers State Secondary Schools Old Students Association',
    description:
      'The official member portal for the Rivers State Secondary Schools Old Students Association. Register, connect, and engage with alumni across Rivers State.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'RSSSOSAA — Rivers State Secondary Schools Old Students Association',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RSSSOSAA — Rivers State Secondary Schools Old Students Association',
    description:
      'The official member portal for the Rivers State Secondary Schools Old Students Association.',
    images: ['/opengraph-image'],
    creator: '@rsssosaa',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full antialiased", geist.variable)}>
      <body className="min-h-full flex flex-col bg-[#ECEBE6]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
