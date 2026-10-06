import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Figtree } from "next/font/google";
import {
  ArrowRight,
  Award,
  Building2,
  CalendarHeart,
  Eye,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Network,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Reveal } from "./reveal";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: 'About',
  description:
    'Uniting alumni, strengthening communities, preserving our educational heritage across Rivers State.',
  openGraph: {
    title: 'About RSSSOSAA',
    description:
      'Uniting alumni, strengthening communities, preserving our educational heritage across Rivers State.',
    url: '/about',
  },
  twitter: {
    title: 'About RSSSOSAA',
    description:
      'Uniting alumni, strengthening communities, preserving our educational heritage across Rivers State.',
  },
};

const coreValues = [
  {
    title: "Unity",
    icon: Users,
    text: "Alumni from every school and background, standing together as one family across Rivers State.",
    span: "col-span-2 lg:row-span-2",
    style: "bg-[#173f26] text-white",
    iconBox: "bg-white/15 text-white",
    textColor: "text-white/80",
  },
  {
    title: "Excellence",
    icon: Award,
    text: "High standards in everything we take on.",
    span: "col-span-1 lg:col-span-2",
    style: "bg-[#E4EBDD] text-[#16201a]",
    iconBox: "bg-[#173f26] text-white",
    textColor: "text-neutral-700",
  },
  {
    title: "Service",
    icon: HandHeart,
    text: "Showing up for our members and communities.",
    span: "col-span-1",
    style: "bg-[#F8F7F2] text-[#16201a]",
    iconBox: "bg-[#173f26]/10 text-[#173f26]",
    textColor: "text-neutral-600",
  },
  {
    title: "Integrity",
    icon: ShieldCheck,
    text: "Open books and clear accountability, always.",
    span: "col-span-2 lg:col-span-1",
    style: "bg-[#d9b86a] text-[#173f26]",
    iconBox: "bg-[#173f26] text-[#d9b86a]",
    textColor: "text-[#173f26]/80",
  },
];

const whatWeDo = [
  { icon: GraduationCap, title: "Learning", text: "Educational programs, scholarships and mentorship." },
  { icon: Network, title: "Connection", text: "Networking and professional growth among members." },
  { icon: HeartHandshake, title: "Welfare", text: "Support for members and their families." },
  { icon: Building2, title: "Our schools", text: "Infrastructure that gives back to our alma maters." },
  { icon: CalendarHeart, title: "Community", text: "Reunions, social events and service projects." },
];

export default function AboutPage() {
  return (
    <main
      className={`${display.variable} ${sans.variable} min-h-screen bg-[#EFEDE6] pb-20 pt-24 text-[#16201a] [font-family:var(--font-sans)] sm:pt-28`}
    >
      <style>{`
        @keyframes rise { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        @keyframes drift { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
        @keyframes spin-slow { to { transform:rotate(360deg) } }
        @keyframes grow { from { transform:scaleX(0) } to { transform:scaleX(1) } }
        .rise { opacity:0; animation: rise .9s cubic-bezier(.22,1,.36,1) forwards }
        .drift { animation: drift 7s ease-in-out infinite }
        .ring { animation: spin-slow 40s linear infinite }
        .grow { transform-origin:left; animation: grow 1s .5s cubic-bezier(.22,1,.36,1) both }
        @media (prefers-reduced-motion: reduce) {
          .rise,.drift,.ring,.grow { animation:none; opacity:1; transform:none }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-24 px-4 sm:space-y-32 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#173f26] px-6 py-14 text-white sm:px-12 sm:py-20 lg:px-16 lg:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#2f7a4b]/40 blur-3xl"
          />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h1
                className="rise text-5xl font-semibold leading-[1.05] tracking-tight [font-family:var(--font-display)] sm:text-6xl lg:text-7xl"
                style={{ animationDelay: "100ms" }}
              >
                One school each.
                <br />
                One family together.
              </h1>
              <div className="grow mt-8 h-px w-24 bg-[#d9b86a]" />
              <p
                className="rise mt-6 max-w-md text-lg leading-relaxed text-white/80"
                style={{ animationDelay: "450ms" }}
              >
                RSSSOSAA brings alumni of Rivers State secondary schools together to strengthen
                our communities and protect the schools that shaped us.
              </p>
            </div>

            <div className="rise flex justify-center" style={{ animationDelay: "300ms" }}>
              <div className="drift relative h-56 w-56 sm:h-72 sm:w-72">
                <div className="ring absolute inset-0 rounded-full border border-dashed border-[#d9b86a]/60" />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-[#F6F5F0] p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
                  <Image
                    src="/logo.png"
                    alt="RSSSOSAA logo"
                    width={240}
                    height={240}
                    priority
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story */}
        <Reveal>
          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight [font-family:var(--font-display)] sm:text-5xl">
              Our story
            </h2>
            <p className="max-w-[62ch] text-lg leading-8 text-neutral-700">
              The Rivers State Secondary Schools Old Students Association was founded to give
              alumni of every secondary school in the state one shared home. Our schools gave us
              our start, personally and professionally. We exist to give something back, to the
              institutions and to the communities around them.
            </p>
          </section>
        </Reveal>

        {/* Vision & Mission */}
        <section className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Our vision",
              icon: Eye,
              text: "A vibrant, supportive community of old students who drive educational excellence and socio-economic progress, and who look after their members and alma maters across Rivers State.",
              tone: "bg-[#F8F7F2]",
            },
            {
              title: "Our mission",
              icon: Target,
              text: "To unite old students of Rivers State secondary schools, grow professional and social networks, back education, champion welfare, and contribute to the advancement of our communities.",
              tone: "bg-[#E4EBDD]",
            },
          ].map(({ title, text, icon: Icon, tone }, i) => (
            <Reveal key={title} delay={i * 120}>
              <div
                className={`group h-full rounded-[1.75rem] ${tone} p-8 transition-transform duration-500 hover:-translate-y-1 sm:p-10`}
              >
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#173f26] text-white transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mb-3 text-3xl font-semibold [font-family:var(--font-display)]">
                  {title}
                </h2>
                <p className="leading-8 text-neutral-700">{text}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Values */}
        <section>
          <Reveal>
            <h2 className="mb-10 max-w-md text-4xl font-semibold leading-tight tracking-tight [font-family:var(--font-display)] sm:text-5xl">
              What we stand for
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:auto-rows-[minmax(200px,auto)]">
            {coreValues.map(({ title, text, icon: Icon, span, style, iconBox, textColor }, i) => (
              <Reveal key={title} delay={i * 90} className={`${span} h-full`}>
                <div
                  className={`group relative flex h-full min-h-[190px] flex-col justify-between overflow-hidden rounded-[1.5rem] p-5 transition-transform duration-500 hover:-translate-y-1 sm:rounded-[1.75rem] sm:p-7 ${style}`}
                >
                  <Icon
                    aria-hidden
                    className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 opacity-[0.08] transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6 lg:h-40 lg:w-40"
                  />
                  <span
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${iconBox}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="relative mt-8">
                    <h3 className="mb-2 text-2xl font-semibold [font-family:var(--font-display)] sm:text-3xl">
                      {title}
                    </h3>
                    <p className={`text-sm leading-6 sm:text-base sm:leading-7 ${textColor}`}>{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* What we do */}
        <section className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight [font-family:var(--font-display)] sm:text-5xl">
                What we do
              </h2>
              <p className="mt-4 max-w-xs leading-7 text-neutral-600">
                Practical support for our members, our schools and our communities.
              </p>
            </div>
          </Reveal>
          <ul>
            {whatWeDo.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 70}>
                <li className="group flex items-center gap-5 border-b border-[#173f26]/15 py-6 first:pt-0 transition-all duration-300 hover:pl-3">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#173f26]/10 text-[#173f26] transition-colors duration-300 group-hover:bg-[#173f26] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold [font-family:var(--font-display)]">
                      {title}
                    </h3>
                    <p className="text-neutral-600">{text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <Reveal>
          <section className="relative overflow-hidden rounded-[2rem] bg-[#173f26] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#2f7a4b]/40 blur-3xl"
            />
            <div className="relative">
              <h2 className="text-4xl font-semibold tracking-tight [font-family:var(--font-display)] sm:text-5xl">
                Come home to your alumni family
              </h2>
              <p className="mx-auto mt-4 mb-10 max-w-md text-lg leading-relaxed text-white/80">
                Join a growing network committed to excellence and community service.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/register"
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d9b86a] px-8 font-semibold text-[#173f26] transition-all hover:bg-[#e6c97f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 sm:w-auto sm:min-w-[180px]"
                >
                  Register now
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/70 px-8 font-semibold transition-all hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 sm:w-auto sm:min-w-[180px]"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}