import type { Metadata } from 'next';
import ContentHub from '@/components/community/ContentHub';
export const metadata: Metadata = { title: 'Welfare', description: 'Public welfare initiatives, donors, beneficiaries and recorded support.' };
export default function Page() { return <ContentHub initialKind="welfare" />; }
