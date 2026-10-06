import Link from 'next/link';

export default function ActivitiesPage() {
  const activities = [
    {
      title: 'Educational Programs',
      desc: 'We support scholarships, mentorship, and academic programs that empower the next generation of students from Rivers State.',
    },
    {
      title: 'Networking Events',
      desc: 'Regular professional meetups, career fairs, and industry conferences that bring alumni together.',
    },
    {
      title: 'Welfare Support',
      desc: 'Providing financial and emotional assistance to members and their families during challenging times.',
    },
    {
      title: 'Community Service',
      desc: 'Contributing to infrastructure projects, social welfare initiatives, and community development across Rivers State.',
    },
    {
      title: 'Annual Reunions',
      desc: 'Our flagship annual event brings alumni from across Nigeria and the diaspora together to reconnect and celebrate.',
    },
    {
      title: 'Skills Training',
      desc: 'Workshops, seminars, and professional development programs designed to upskill our members.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#ECEBE6] pb-20 pt-28 sm:pt-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Page Header */}
        <div className="text-center">
          <span className="text-xs tracking-widest uppercase text-[#1a472a] font-semibold">
            WHAT WE DO
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#121417] leading-tight">
            Our Activities
          </h1>
          <p className="mt-5 text-neutral-600 leading-relaxed max-w-xl mx-auto text-lg">
            From education to community service, we are committed to making a difference.
          </p>
        </div>

        {/* Activities Grid — 3-col desktop, 1-col mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <div
              key={activity.title}
              className="bg-[#F6F5F0] rounded-2xl border border-white/60 shadow-xl shadow-black/5 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
            >
              <div className="h-3 w-full bg-gradient-to-r from-[#1a472a] via-[#2d5f3f] to-[#1a472a]" />
              <div className="px-8 py-9">
                <h3 className="font-bold text-[#121417] text-xl mb-3">{activity.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{activity.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl overflow-hidden">
          <div
            className="px-8 py-16 text-center"
            style={{background: 'linear-gradient(135deg,#1a472a 0%,#2d5f3f 60%,#1a472a 100%)'}}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Get Involved</h2>
            <p className="text-white/80 leading-relaxed mb-10 max-w-lg mx-auto text-lg">
              Join us and become part of a community that makes a real difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-white text-[#1a472a] px-10 py-3.5 font-semibold text-sm tracking-wide transition-all duration-300 hover:bg-white/90"
              >
                Become a Member
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
