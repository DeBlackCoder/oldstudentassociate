import type { Metadata } from 'next';
import ContentHub from '@/components/community/ContentHub';
export const metadata: Metadata = { title: 'Programmes', description: 'Association programmes, schedules, eligibility and participation details.' };
export default function Page() { return <ContentHub initialKind="programmes" />; }
