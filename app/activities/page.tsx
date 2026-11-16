import type { Metadata } from 'next';
import ContentHub from '@/components/community/ContentHub';
export const metadata: Metadata = { title: 'Activities', description: 'Explore association programmes, welfare initiatives and scholarship opportunities.' };
export default function Page() { return <ContentHub />; }
