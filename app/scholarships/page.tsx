import type { Metadata } from 'next';
import ContentHub from '@/components/community/ContentHub';
export const metadata: Metadata = { title: 'Scholarships', description: 'Scholarship opportunities, eligibility, deadlines and applications.' };
export default function Page() { return <ContentHub initialKind="scholarships" />; }
