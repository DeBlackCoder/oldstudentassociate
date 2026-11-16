import type { Metadata } from 'next';
import LiveVideos from '@/components/youtube/LiveVideos';

export const metadata: Metadata = {
  title: 'Live & Videos',
  description: 'Watch RSSSOSAA live on YouTube and browse the association’s recent videos.',
};

export default function LivePage() {
  return <LiveVideos />;
}
