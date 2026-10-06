import Link from 'next/link';

export default function MembershipPage() {
  const benefits = [
    {
      num: '01',
      title: 'Exclusive Networking',
      desc: 'Gain access to exclusive events, seminars, and professional programs that expand your network.',
    },
    {
      num: '02',
      title: 'Alumni Directory',
      desc: 'Connect with fellow alumni across industries, professions, and generations.',
    },
    {
      num: '03',
      title: 'Mentorship Programs',
      desc: 'Benefit from guided professional growth through our structured mentorship initiatives.',
    },
    {
      num: '04',
      title: 'Association Updates',
      desc: 'Stay informed with the latest news, opportunities, and announcements from the association.',
    },
    {
      num: '05',
      title: 'Welfare Support',
      desc: 'Access welfare assistance and support programs during difficult times.',
    },
    {
      num: '06',
      title: 'Membership Card',
      desc: 'Receive your official membership card and digital verification of your alumni status.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Register Online',
      desc: 'Fill out the membership registration form on our website.',
    },
    {
      number: '02',
      title: 'Provide School Info',
      desc: 'Submit your secondary school name, graduation year, and other details.',
    },
    {
      number: '03',
      title: 'Submit for Verification',
      desc: 'Our team reviews and verifies your information.',
    },
    {
      number: '04',
      title: 'Receive Membership',
      desc: 'Get your membership number and official card upon approval.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#ECEBE6] pb-20 pt-28 sm:pt-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Page Header */}
        <div className="text-center">
          <span className="text-xs tracking-widest uppercase text-[#1a472a] font-semibold">
            JOIN RSSSOSAA
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#121417] leading-tight">
            Membership Benefits
          </h1>
          <p className="mt-5 text-neutral-600 leading-relaxed max-w-xl mx-auto text-lg">
            Discover what it means to be part of our growing alumni community.
          </p>
        </div>

        {/* Benefits Grid — 3-col desktop, 1-col mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-[#F6F5F0] rounded-2xl border border-white/60 shadow-xl shadow-black/5 px-8 py-9 flex flex-col gap-3"
            >
              <span className="text-xs font-bold text-[#1a472a] tracking-widest">{benefit.num}</span>
              <h3 className="font-bold text-[#121417] text-lg leading-snug">{benefit.title}</h3>
              <p className="text-neutral-600 leading-relaxed text-sm">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* How to Join — visual stepper */}
        <div className="bg-[#F6F5F0] rounded-2xl border border-white/60 shadow-xl shadow-black/5 px-8 py-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#121417] mb-10">How to Join</h2>

          {/* Desktop stepper */}
          <div className="hidden lg:flex items-start gap-0">
            {steps.map((step, i) => (
              <div key={step.number} className="flex-1 flex flex-col items-center text-center relative">
                {i < steps.length - 1 && (
                  <div className="absolute top-7 left-1/2 w-full border-t-2 border-dashed border-[#1a472a]/30" />
                )}
                <span className="relative z-10 flex items-center justify-center w-14 h-14 rounded-full bg-[#1a472a] text-white font-bold text-lg mb-4">
                  {step.number}
                </span>
                <h3 className="font-semibold text-[#121417] mb-2">{step.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed max-w-[160px]">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Mobile stepper */}
          <div className="flex flex-col gap-6 lg:hidden">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-5">
                <span className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-[#1a472a] text-white font-bold text-base">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-semibold text-[#121417] mb-1">{step.title}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl overflow-hidden">
          <div
            className="px-8 py-16 text-center"
            style={{background: 'linear-gradient(135deg,#1a472a 0%,#2d5f3f 60%,#1a472a 100%)'}}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Ready to Join?</h2>
            <p className="text-white/80 leading-relaxed mb-10 max-w-lg mx-auto text-lg">
              Take the first step towards connecting with thousands of alumni across Rivers State.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-white text-[#1a472a] px-10 py-3.5 font-semibold text-sm tracking-wide transition-all duration-300 hover:bg-white/90"
              >
                Register Now
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border-2 border-white text-white px-10 py-3.5 font-semibold text-sm tracking-wide transition-all duration-300 hover:bg-white/10"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
