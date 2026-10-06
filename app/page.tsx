import Hero from '@/components/Hero';
import { Programs, HowToJoin } from "@/components/sections";

export default function HomePage() {
  return (
    <div className="bg-white">
      <Hero />
       <Programs />
      <HowToJoin />
    </div>
  );
}
