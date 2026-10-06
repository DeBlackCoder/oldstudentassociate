'use client';

import { useState } from 'react';
import { FormField, Input } from '@/components/forms/FormField';

interface MemberData {
  fullName: string;
  secondarySchool: string;
  graduationYear: number;
  membershipNumber: string;
  status: string;
}

export default function VerifyMemberPage() {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError('');
    setMemberData(null);

    try {
      const response = await fetch(`/api/verify-member?number=${encodeURIComponent(membershipNumber)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Member not found');
      }

      setMemberData(data.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Verify Membership
          </h1>
          <p className="text-lg text-gray-600">
            Enter a membership number to verify its authenticity and view member details
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-white border border-gray-200 p-8 md:p-12 mb-8">
          <form onSubmit={handleVerify}>
            <FormField 
              label="Membership Number" 
              name="membershipNumber"
              helpText="Format: RSSSOSAA/YYYY/XXXXX"
            >
              <Input
                id="membershipNumber"
                value={membershipNumber}
                onChange={(e) => setMembershipNumber(e.target.value.toUpperCase())}
                placeholder="RSSSOSAA/2026/00001"
                className="text-center text-lg font-mono"
              />
            </FormField>

            <button
              type="submit"
              disabled={isSearching || !membershipNumber}
              className="w-full bg-[#1a472a] text-white px-8 py-4 font-medium hover:bg-[#2d5f3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Verifying...' : 'Verify Membership'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-300 p-6 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Verification Failed</h3>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Member Data */}
        {memberData && (
          <div className="bg-white border-2 border-green-600 p-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Valid Membership</h2>
                <p className="text-gray-600">This is a verified member of RSSSOSAA</p>
              </div>
            </div>

            <dl className="space-y-4 border-t border-gray-200 pt-6">
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Member Name</dt>
                <dd className="text-xl font-semibold text-gray-900">{memberData.fullName}</dd>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600 mb-1">School</dt>
                  <dd className="text-base text-gray-900">{memberData.secondarySchool}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 mb-1">Graduation Year</dt>
                  <dd className="text-base text-gray-900">{memberData.graduationYear}</dd>
                </div>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Membership Number</dt>
                <dd className="text-lg font-mono text-gray-900">{memberData.membershipNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Status</dt>
                <dd>
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-medium rounded-full">
                    {memberData.status}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> This verification only confirms membership status. For security reasons, 
                personal contact information is not displayed publicly.
              </p>
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">About Verification</h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            This verification system allows you to confirm the authenticity of RSSSOSAA membership cards. 
            Only approved members with valid membership numbers will show up in this system. If you suspect 
            a fraudulent membership card, please contact the association immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
