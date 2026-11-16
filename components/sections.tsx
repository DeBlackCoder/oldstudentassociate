import Link from "next/link";
import { Fraunces, Figtree } from "next/font/google";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import ContentHub from "@/components/community/ContentHub";
import CommunityHighlights from "@/components/community/CommunityHighlights";
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const wrap = `${display.variable} ${sans.variable} [font-family:var(--font-sans)]`;
const head = "[font-family:var(--font-display)]";
const steps = [
  { title: "Create your account", text: "Register with your name and email. It takes a couple of minutes." },
  { title: "Tell us about your school", text: "Add the school you attended and the years you were there, so we can place you among your classmates." },
  { title: "Meet your alumni family", text: "Join programs, find old friends and start giving back." },
];
export function Programs() {
  return <><CommunityHighlights /><section id="programmes" className="bg-[#EFEDE6] px-4 pb-16 pt-10 sm:px-6 lg:px-8"><ContentHub embedded /></section></>;
}
export function HowToJoin() {
  return (
    <section className={`${wrap} bg-[#EFEDE6] px-4 pb-24 text-white sm:px-6 lg:px-8`}>
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#173f26] px-6 py-14 sm:px-12 sm:py-20 lg:px-16">
          <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#2f7a4b]/40 blur-3xl" />
          <div className="relative">
            <h2 className={`max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${head}`}>
              Joining takes three simple steps
            </h2>
            <div className="mt-2 h-px w-20 bg-[#d9b86a]" />

            <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <div aria-hidden className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] border-t border-dashed border-[#d9b86a]/50 md:block" />
              <div aria-hidden className="absolute bottom-6 left-6 top-6 w-px border-l border-dashed border-[#d9b86a]/50 md:hidden" />
              {steps.map(({ title, text }, i) => (
                <li key={title} className="relative flex gap-5 md:block">
                  <span className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#d9b86a] text-xl font-semibold text-[#173f26] ${head}`}>
                    {i + 1}
                  </span>
                  <div className="md:mt-6">
                    <h3 className={`mb-2 text-2xl font-semibold ${head}`}>{title}</h3>
                    <p className="max-w-xs leading-7 text-white/80">{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/register"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#d9b86a] px-8 font-semibold text-[#173f26] transition-all hover:bg-[#e6c97f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
              >
                Become a member
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 px-8 font-semibold transition-all hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
              >
                Ask us a question
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
