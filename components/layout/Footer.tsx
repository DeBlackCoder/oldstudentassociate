import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f2918] text-white py-12 flex justify-center items-center">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 w-full">
        {/* Single Row Layout - Copyright, Logo, Links */}
        <div className="flex flex-col md:flex-row justify-around items-center gap-8">
          {/* Left - Copyright */}
          <div className="text-center">
            <p className="text-gray-300 text-sm">
              © {currentYear} RSSSOSAA. All rights reserved.
            </p>
          </div>

          {/* Center - Logo and Name */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 mb-3">
              <Image
                src="/logo.png"
                alt="RSSSOSAA Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-base font-bold text-center leading-tight">
              Rivers State Secondary Schools
              <br />
              Old Students Association
            </h3>
          </div>

          {/* Right - Links */}
          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center gap-6 text-gray-300 text-sm">
              <Link href="/live" className="hover:text-white transition-colors">Live & Videos</Link>
              <Link href="/programmes" className="hover:text-white transition-colors">Programmes</Link>
              <Link href="/welfare" className="hover:text-white transition-colors">Welfare</Link>
              <Link href="/scholarships" className="hover:text-white transition-colors">Scholarships</Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
