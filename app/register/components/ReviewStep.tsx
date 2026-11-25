'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegistrationData, clearRegistrationDraft } from '../page';

interface ReviewStepProps {
  data: RegistrationData;
  onBack: () => void;
  onEdit: (step: number) => void;
  applicationRef?: string | null;
  profileSaved?: boolean;
  paymentStatus?: string;
  draftStorageKey?: string;
  onSaved?: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | string[] | undefined }) {
  return <div className="py-3 border-b border-gray-200"><dt className="text-sm font-medium text-gray-600">{label}</dt><dd className="mt-1 text-base text-gray-900">{Array.isArray(value) ? value.length ? <ul className="list-disc list-inside">{value.map((item, i) => <li key={i}>{item}</li>)}</ul> : 'Not specified' : value || 'Not specified'}</dd></div>;
}

function SectionHeader({ title, step, onEdit }: { title: string; step: number; onEdit: (step: number) => void }) {
  return <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-gray-900">{title}</h3><button type="button" onClick={() => onEdit(step)} className="text-[#1a472a] hover:underline text-sm font-medium">Edit</button></div>;
}

export default function ReviewStep({ data, onBack, onEdit, applicationRef, profileSaved, paymentStatus, draftStorageKey, onSaved }: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          graduationYear: data.graduationYear ? parseInt(String(data.graduationYear), 10) : data.graduationYear,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your form could not be saved');
      // Clear saved draft so the form starts fresh next time
      clearRegistrationDraft(draftStorageKey);
      if (result.paymentStatus === 'paid' || paymentStatus === 'paid') {
        onSaved?.();
        router.push('/members/dashboard?tab=application');
      } else {
        const ref = result.applicationRef || applicationRef;
        if (!ref) throw new Error('Your form was saved. Open Registration payment in your dashboard to continue.');
        onSaved?.();
        router.push(`/register/payment-choice?ref=${encodeURIComponent(ref)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your form could not be saved');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Registration Form</h2>
        <p className="text-gray-600">Check your details before saving. Changes are saved when you use the button below.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Personal Information */}
      <div className="mb-8">
        <SectionHeader title="Personal Information" step={1} onEdit={onEdit} />
        <dl className="bg-gray-50 p-6">
          <InfoRow label="Full Name" value={data.fullName} />
          <InfoRow label="Date of Birth" value={new Date(data.dateOfBirth).toLocaleDateString('en-GB', { timeZone: 'UTC' })} />
          <InfoRow label="Gender" value={data.gender} />
          <InfoRow label="Phone Number" value={data.phoneNumber} />
          <InfoRow label="WhatsApp Number" value={data.whatsappNumber} />
          <InfoRow label="Email Address" value={data.email} />
          <InfoRow label="Residential Address" value={data.residentialAddress} />
          <InfoRow label="State of Origin" value={data.stateOfOrigin} />
          <InfoRow label="LGA" value={data.lga} />
          {data.referredBy && <InfoRow label="Referred By" value={data.referredBy} />}
        </dl>
      </div>

      {/* School Information */}
      <div className="mb-8">
        <SectionHeader title="School Information" step={2} onEdit={onEdit} />
        <dl className="bg-gray-50 p-6">
          <InfoRow label="Secondary School" value={data.secondarySchool} />
          <InfoRow label="Year of Graduation" value={data.graduationYear} />
          <InfoRow label="Position Held in School" value={data.positionHeldInSchool || 'None'} />
        </dl>
      </div>

      {/* Professional Information */}
      <div className="mb-8">
        <SectionHeader title="Professional Information" step={3} onEdit={onEdit} />
        <dl className="bg-gray-50 p-6">
          <InfoRow label="Current Occupation" value={data.currentOccupation} />
          <InfoRow label="Employment Type" value={data.employmentType} />
          {data.organizationName && <InfoRow label="Organization/Business" value={data.organizationName} />}
          <InfoRow label="Skills" value={data.skills} />
        </dl>
      </div>

      {/* Participation */}
      <div className="mb-8">
        <SectionHeader title="Participation & Contribution" step={4} onEdit={onEdit} />
        <dl className="bg-gray-50 p-6">
          <InfoRow label="Willing to Participate" value={data.willingToParticipate ? 'Yes' : 'No'} />
          {data.willingToParticipate && (
            <>
              <InfoRow label="Contribution Areas" value={data.contributionAreas} />
              {data.otherContributionArea && <InfoRow label="Other Contribution" value={data.otherContributionArea} />}
            </>
          )}
        </dl>
      </div>

      {/* Declaration */}
      <div className="mb-8">
        <SectionHeader title="Declaration" step={5} onEdit={onEdit} />
        <dl className="bg-gray-50 p-6">
          <InfoRow label="Agreement Status" value={data.agreedToDeclaration ? 'Agreed to terms and conditions' : 'Not agreed'} />
          <InfoRow label="Signature" value={data.signature} />
          <InfoRow label="Date" value={new Date(data.signatureDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })} />
        </dl>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300">
        <p className="text-sm text-yellow-800">
          {paymentStatus === 'paid' ? 'Your registration payment is confirmed. Saving updates your form details while keeping your application status.' : <><strong>Save first, then choose:</strong> If you already paid the registration fee directly to an administrator, you can report it for confirmation. Otherwise, continue to payment.</>}
        </p>
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full sm:w-auto border border-gray-300 text-gray-700 px-8 py-3 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-[#1a472a] text-white px-8 py-3 font-medium hover:bg-[#2d5f3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : paymentStatus === 'paid' ? 'Save Changes' : profileSaved ? 'Save Changes & Continue' : 'Save Form & Continue'}
        </button>
      </div>
    </div>
  );
}
