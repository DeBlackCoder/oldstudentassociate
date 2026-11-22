'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const applicationRef = searchParams.get('ref');

  const handlePrint = () => {
    window.print();
  };

  if (!applicationRef) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Invalid application reference.</p>
            <Link href="/register" className="text-[#1a472a] hover:underline mt-4 inline-block">
              Go back to registration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="bg-white border-2 border-green-600 p-8 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Registration Submitted Successfully
            </h1>
            <p className="text-gray-600">
              Your application has been received and is currently awaiting verification.
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-6 my-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Application Reference Number</dt>
                <dd className="text-2xl font-bold text-[#1a472a] font-mono break-all">{applicationRef}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Submission Date</dt>
                <dd className="text-lg text-gray-900">{new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Current Status</dt>
                <dd>
                  <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 text-sm font-medium">
                    Pending Verification
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">What Happens Next?</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Pay your membership fee to activate your application</li>
              <li>Association administrators will review your application</li>
              <li>Your information will be verified for accuracy</li>
              <li>Once approved, you will receive your unique membership number</li>
            </ol>
          </div>

          {/* Pay Now CTA */}
          <div className="mt-6 rounded-2xl bg-[#1a472a] px-6 py-6 text-white text-center"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            <p className="text-sm text-white/70 uppercase tracking-widest font-semibold mb-1">One More Step</p>
            <p className="text-xl font-bold mb-1">Pay Your Membership Fee</p>
            <p className="text-sm text-white/70 mb-5">Your application cannot be reviewed until payment is completed.</p>
            <a
              href={`/register/payment?ref=${applicationRef}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-[#1a472a] hover:bg-white/90 transition-all active:scale-95 shadow-lg"
            >
              Pay ₦2,000 Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Please keep your application reference number safe. You may need it for future correspondence.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handlePrint}
              className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 font-medium hover:bg-gray-50 transition-colors"
            >
              Print Acknowledgement
            </button>
            <Link
              href="/verify-member"
              className="flex-1 bg-[#1a472a] text-white px-6 py-3 font-medium text-center hover:bg-[#2d5f3f] transition-colors"
            >
              Verify Membership
            </Link>
          </div>
          <Link
            href="/"
            className="block text-center mt-4 text-[#1a472a] hover:underline"
          >
            Return to Homepage
          </Link>
        </div>

        {/* Contact Information */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>For inquiries about your application, contact us at:</p>
          <p className="mt-1">
            <a href="mailto:oldstudentassociation94@gmail.com" className="text-[#1a472a] hover:underline">oldstudentassociation94@gmail.com</a>
            {' | '}
            <a href="tel:+2348000000000" className="text-[#1a472a] hover:underline">+234 800 000 0000</a>
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-2xl, .max-w-2xl * {
            visibility: visible;
          }
          .max-w-2xl {
            position: absolute;
            left: 0;
            top: 0;
          }
          button, a {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
