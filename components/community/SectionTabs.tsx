'use client';
import { CalendarDays, FileText, GraduationCap, HeartHandshake, ClipboardCheck, type LucideIcon } from 'lucide-react';
import type { ContentKind } from '@/lib/community/types';

export const SECTION_ICONS: Record<ContentKind | 'applications', LucideIcon> = {
  programmes: CalendarDays, welfare: HeartHandshake, scholarships: GraduationCap, minutes: FileText, applications: ClipboardCheck,
};
export default function SectionTabs<T extends ContentKind | 'applications'>({ items, value, onChange, dark = false, label }: {
  items: { value: T; label: string }[]; value: T; onChange: (value: T) => void; dark?: boolean; label: string;
}) {
  return <nav aria-label={label} className={`flex gap-1.5 overflow-x-auto rounded-2xl border p-1.5 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#173f26]/10 bg-white/70'}`}>
    {items.map((item, index) => {
      const Icon: LucideIcon = SECTION_ICONS[item.value];
      return <button key={item.value} type="button" aria-current={value === item.value ? 'page' : undefined}
        onClick={() => onChange(item.value)}
        onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % items.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = items.length - 1;
          else return;
          event.preventDefault();
          (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
          onChange(items[next].value);
        }}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:flex-1 ${value === item.value ? (dark ? 'bg-[#2d7045] text-white shadow-lg shadow-black/10' : 'bg-[#173f26] text-white shadow-md shadow-[#173f26]/15') : dark ? 'text-white/55 hover:bg-white/5 hover:text-white' : 'text-neutral-500 hover:bg-[#E4EBDD]/50 hover:text-[#173f26]'}`}>
        <Icon className="h-4 w-4" aria-hidden />{item.label}
      </button>;
    })}
  </nav>;
}
