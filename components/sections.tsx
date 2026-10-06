import Link from "next/link";
import { Fraunces, Figtree } from "next/font/google";
import {
  ArrowRight,
  Building2,
  CalendarHeart,
  GraduationCap,
  HeartHandshake,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const wrap = `${display.variable} ${sans.variable} [font-family:var(--font-sans)]`;
const head = "[font-family:var(--font-display)]";

const programs = [
  {
    title: "Scholarships",
    icon: GraduationCap,
    text: "Helping bright students in our schools stay in school and aim higher, funded by the alumni who sat in those same classrooms.",
    cls: "col-span-2",
    tone: "bg-[#F8F7F2] text-[#16201a]",
    sub: "text-neutral-600",
    chip: "bg-[#173f26] text-white",
  },
  {
    title: "Mentorship",
    icon: Users,
    text: "Pairing members with students and young professionals who can use a guide.",
    cls: "md:row-span-2",
    tone: "bg-[#173f26] text-white",
    sub: "text-white/80",
    chip: "bg-white/15 text-white",
  },
  {
    title: "Welfare",
    icon: HeartHandshake,
    text: "Standing with members and their families when it matters most.",
    cls: "",
    tone: "bg-[#E4EBDD] text-[#16201a]",
    sub: "text-neutral-700",
    chip: "bg-[#173f26] text-white",
  },
  {
    title: "Our alma maters",
    icon: Building2,
    text: "Building and repairing the classrooms, labs and halls we remember.",
    cls: "col-span-2 md:col-span-1",
    tone: "bg-[#d9b86a] text-[#173f26]",
    sub: "text-[#173f26]/80",
    chip: "bg-[#173f26] text-[#d9b86a]",
  },
  {
    title: "Reunions & events",
    icon: CalendarHeart,
    text: "Annual gatherings, school-by-school meetups and community service days that keep old friendships alive and start new ones.",
    cls: "col-span-2 md:col-span-3",
    tone: "bg-[#F8F7F2] text-[#16201a]",
    sub: "text-neutral-600",
    chip: "bg-[#173f26] text-white",
  },
];

const steps = [
  { title: "Create your account", text: "Register with your name and email. It takes a couple of minutes." },
  { title: "Tell us about your school", text: "Add the school you attended and the years you were there, so we can place you among your classmates." },
  { title: "Meet your alumni family", text: "Join programs, find old friends and start giving back." },
];

export function Programs() {
  return (
    <section className={`${wrap} bg-[#EFEDE6] px-4 pb-24 pt-16 text-[#16201a] sm:px-6 sm:pt-20 lg:px-8`}>
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
            <div className="max-w-xl">
              <h2 className={`text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${head}`}>
                Giving back to the schools that gave us a start
              </h2>
              <p className="mt-4 text-lg leading-8 text-neutral-600">
                Every program is run by alumni, for students, members and the communities around our schools.
              </p>
            </div>
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 self-start font-semibold text-[#173f26] underline decoration-[#d9b86a] decoration-2 underline-offset-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f26] md:self-auto"
            >
              Read our story
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:auto-rows-[minmax(190px,auto)]">
          {programs.map(({ title, icon: Icon, text, cls, tone, sub, chip }, i) => (
            <Reveal key={title} delay={i * 80} className={`${cls} h-full`}>
              <article
                className={`group relative flex h-full min-h-[200px] flex-col justify-between overflow-hidden rounded-[1.5rem] p-6 transition-transform duration-500 hover:-translate-y-1 sm:rounded-[1.75rem] sm:p-8 ${tone}`}
              >
                <Icon
                  aria-hidden
                  className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 opacity-[0.08] transition-transform duration-700 group-hover:-rotate-6 group-hover:scale-110"
                />
                <span className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${chip}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative mt-8">
                  <h3 className={`mb-2 text-2xl font-semibold sm:text-3xl ${head}`}>{title}</h3>
                  <p className={`max-w-prose text-sm leading-6 sm:text-base sm:leading-7 ${sub}`}>{text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
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