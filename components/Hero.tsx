import Image from "next/image";
import Link from "next/link";
import { Fraunces, Figtree } from "next/font/google";
import { ArrowRight, CalendarHeart, GraduationCap, HeartHandshake, Network } from "lucide-react";
import "@/styles/globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&h=1080&fit=crop&q=80";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173f26] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F5F0]";

// Mobile: 48px, full width, stacked. md+: 56px, sharing a row and wrapping when the panel is narrow.
const buttonBase = `group inline-flex h-12 w-full max-w-sm select-none items-center justify-center gap-2 rounded-full px-6 text-base font-semibold touch-manipulation [-webkit-tap-highlight-color:transparent] transition-all duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none md:h-14 md:w-auto md:max-w-[260px] md:min-w-0 md:flex-1 md:basis-[200px] md:px-8 md:text-lg md:hover:-translate-y-0.5 ${focusRing}`;

const benefits = [
  { icon: GraduationCap, title: "Scholarships & mentorship", text: "Help for the next generation of students." },
  { icon: Network, title: "A professional network", text: "Meet alumni from schools across the state." },
  { icon: HeartHandshake, title: "Welfare support", text: "Care for members and their families." },
  { icon: CalendarHeart, title: "Reunions & events", text: "Stay close to your classmates and community." },
];

const fillet = "M0 28 L28 28 C12.54 28 0 15.46 0 0 Z";

export default function Hero() {
  return (
    <section
      id="home"
      className={`${display.variable} ${sans.variable} flex flex-col items-center justify-start overflow-x-hidden bg-[#EFEDE6] px-3 pb-12 pt-4 text-[#16201a] [font-family:var(--font-sans)] sm:px-4 sm:pb-10 md:px-6 md:pb-14 lg:px-8 lg:pb-16`}
    >
      <style>{`
        @keyframes settle { from { transform:scale(1.14) } to { transform:scale(1.01) } }
        @keyframes rise { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:none } }
        @keyframes slide-up { from { transform:translateY(40px); opacity:0 } to { transform:none; opacity:1 } }
        @keyframes logo-in { from { opacity:0; transform:scale(.8) } to { opacity:1; transform:scale(1) } }
        @keyframes drift { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
        @keyframes grow { from { transform:scaleX(0) } to { transform:scaleX(1) } }
        .hero-photo { animation: settle 2.6s cubic-bezier(.22,1,.36,1) both }
        .hero-panel { animation: slide-up 1s .35s cubic-bezier(.22,1,.36,1) backwards }
        .hero-logo { animation: logo-in 1.1s .15s cubic-bezier(.22,1,.36,1) backwards, drift 9s 1.3s ease-in-out infinite }
        .hero-rise { animation: rise .9s cubic-bezier(.22,1,.36,1) backwards }
        @keyframes spin-slow { to { transform:rotate(360deg) } }
        .hero-ring { animation: spin-slow 50s linear infinite }
        .hero-line { transform-origin:left; animation: grow .9s 1s cubic-bezier(.22,1,.36,1) backwards }
        @media (prefers-reduced-motion: reduce) {
          .hero-photo,.hero-panel,.hero-logo,.hero-rise,.hero-line,.hero-ring { animation:none }
        }
      `}</style>

      <div className="mx-auto flex w-full flex-col max-md:min-h-[calc(100svh-2rem)] md:h-[100vh] md:min-h-[34rem] md:w-[95%]">
        {/* Outer frame */}
        <div className="relative flex w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[#F6F5F0] p-3 shadow-xl shadow-black/5 max-md:flex-1 sm:rounded-[36px] sm:p-4 md:h-full md:p-6 lg:rounded-[42px] lg:p-7">
          {/* Photo canvas */}
          <div className="relative flex w-full flex-col overflow-hidden rounded-[22px] bg-[#E2DFD8] ring-1 ring-inset ring-white/50 max-md:flex-1 sm:rounded-[30px] md:block md:h-full lg:rounded-[34px]">
            {/* Background photo (decorative) */}
            <div className="hero-photo absolute inset-0 h-full w-full">
              <Image
                src={HERO_IMAGE}
                alt=""
                fill
                priority
                sizes="(max-width: 1360px) 100vw, 1360px"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#173f26]/25 via-transparent to-black/10" />
            </div>

            {/* Logo: frosted badge on mobile, centred over the photo from md up */}
            <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-6 pt-20 md:absolute md:left-1/2 md:top-1/2 md:flex-none md:-translate-x-1/2 md:-translate-y-1/2 md:p-0">
              <div className="hero-logo relative flex h-32 w-32 items-center justify-center max-md:rounded-full max-md:bg-[#F6F5F0]/85 max-md:p-4 max-md:shadow-xl max-md:shadow-black/10 max-md:ring-1 max-md:ring-white/70 max-md:backdrop-blur-md min-[400px]:h-36 min-[400px]:w-36 sm:h-44 sm:w-44 md:h-96 md:w-96 lg:h-[32rem] lg:w-[32rem]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-6 -z-10 hidden rounded-full bg-white/30 blur-3xl md:block"
                />
                <div
                  aria-hidden
                  className="hero-ring pointer-events-none absolute -inset-3 hidden rounded-full border border-dashed border-[#d9b86a]/70 md:block lg:-inset-5"
                />
                <Image
                  src="/logo.png"
                  alt="Rivers State Secondary Schools Alumni logo"
                  width={512}
                  height={512}
                  priority
                  className="h-full w-full object-contain drop-shadow-2xl max-md:drop-shadow-none"
                />
              </div>
            </div>

            {/* Member benefits: glass card on wide screens */}
            <aside
              className="hero-rise absolute bottom-6 right-6 z-20 hidden w-80 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl xl:block"
              style={{ animationDelay: "1300ms" }}
              aria-label="Member benefits"
            >
              <h2 className="mb-4 text-xl font-semibold [font-family:var(--font-display)]">
                What members enjoy
              </h2>
              <ul className="space-y-4">
                {benefits.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#173f26] text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-5">
                      <span className="block font-semibold">{title}</span>
                      <span className="text-neutral-600">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Headline panel */}
            <div className="hero-panel relative z-20 w-full max-w-[680px] max-md:max-w-none md:absolute md:bottom-0 md:left-0 md:w-[62%] lg:w-[54%]">
              <div className="relative flex h-auto flex-col items-center justify-center gap-4 rounded-tr-[32px] bg-[#F6F5F0] px-5 pb-8 pt-8 text-center sm:px-10 sm:pb-10 sm:pt-10 md:min-h-[30rem] md:items-start md:gap-6 md:rounded-tr-[42px] md:pb-16 md:pl-14 md:pr-20 md:pt-16 md:text-left lg:pb-20 lg:pt-20">
                {/* Concave corners joining the panel to the frame */}
                <svg className="pointer-events-none absolute -top-7 left-0 h-7 w-7 fill-[#F6F5F0]" viewBox="0 0 28 28" aria-hidden="true">
                  <path d={fillet} />
                </svg>
                <svg className="pointer-events-none absolute -right-7 bottom-0 hidden h-7 w-7 fill-[#F6F5F0] md:block" viewBox="0 0 28 28" aria-hidden="true">
                  <path d={fillet} />
                </svg>

                <h1 className="[text-wrap:balance]">
                  <span
                    className="hero-rise block text-xl italic text-[#173f26]/75 [font-family:var(--font-display)] sm:text-2xl md:text-3xl"
                    style={{ animationDelay: "600ms" }}
                  >
                    Welcome to
                  </span>
                  <span
                    className="hero-rise mt-1 block text-[28px] font-semibold leading-[1.1] tracking-tight text-[#16201a] [font-family:var(--font-display)] min-[400px]:text-[32px] sm:text-[42px] md:text-[40px] lg:text-[46px] xl:text-[52px]"
                    style={{ animationDelay: "720ms" }}
                  >
                    Rivers State Secondary Schools Old Students Association
                  </span>
                </h1>

                <div className="hero-line h-px w-20 bg-[#c9a24d]" />

                <p
                  className="hero-rise max-w-[480px] text-base leading-relaxed text-neutral-600 sm:text-lg md:text-xl"
                  style={{ animationDelay: "900ms" }}
                >
                  For members to connect and support each other.
                </p>

                <div
                  className="hero-rise mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-3 pt-1 md:mx-0 md:mt-2 md:max-w-none md:flex-row md:flex-wrap md:justify-start md:gap-4 md:pt-0"
                  style={{ animationDelay: "1050ms" }}
                >
                  <Link
                    href="/register"
                    className={`${buttonBase} bg-[#173f26] text-white shadow-[0_10px_24px_-10px_rgba(23,63,38,0.7)] hover:bg-[#1f5233] hover:shadow-[0_14px_28px_-10px_rgba(23,63,38,0.75)]`}
                  >
                    Become a member
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9b86a] text-[#173f26] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </span>
                  </Link>
                  <Link
                    href="/login"
                    className={`${buttonBase} border-[1.5px] border-[#173f26] bg-white/40 text-[#173f26] hover:bg-[#173f26] hover:text-white md:hover:shadow-lg`}
                  >
                    Already a member
                  </Link>
                </div>

                <ul
                  className="hero-rise flex flex-wrap justify-center gap-2 border-t border-[#173f26]/10 pt-5 md:hidden"
                  style={{ animationDelay: "1200ms" }}
                  aria-label="Member benefits"
                >
                  {benefits.map(({ icon: Icon, title }) => (
                    <li key={title} className="inline-flex items-center gap-1.5 rounded-full bg-[#173f26]/[0.07] px-3 py-1.5 text-xs font-medium text-[#173f26]">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}