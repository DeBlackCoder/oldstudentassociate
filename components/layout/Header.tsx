'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-[#1a472a] flex items-center justify-center text-white font-bold text-xl">
              RS
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-[#1a472a] leading-tight">
                RIVERS STATE SECONDARY SCHOOLS
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wide">
                Old Students Association
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link href="/" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              About
            </Link>
            <Link href="/membership" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              Membership
            </Link>
            <Link href="/activities" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              Activities
            </Link>
            <Link href="/schools" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              Schools
            </Link>
            <Link href="/verify-member" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              Verify Member
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-[#1a472a] font-medium transition-colors">
              Contact
            </Link>
            <Link 
              href="/register" 
              className="bg-[#1a472a] text-white px-6 py-2.5 font-medium hover:bg-[#2d5f3f] transition-colors"
            >
              Register
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-700"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <Link href="/" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                About
              </Link>
              <Link href="/membership" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                Membership
              </Link>
              <Link href="/activities" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                Activities
              </Link>
              <Link href="/schools" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                Schools
              </Link>
              <Link href="/verify-member" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                Verify Member
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-[#1a472a] font-medium py-2">
                Contact
              </Link>
              <Link 
                href="/register" 
                className="bg-[#1a472a] text-white px-6 py-3 font-medium text-center hover:bg-[#2d5f3f] transition-colors"
              >
                Register
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
