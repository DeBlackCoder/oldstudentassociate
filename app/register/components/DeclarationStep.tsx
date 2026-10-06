'use client';

import { useState } from 'react';
import { FormField, Input, Checkbox } from '@/components/forms/FormField';
import { RegistrationData } from '../page';

interface DeclarationStepProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  returnToReview?: boolean;
}

export default function DeclarationStep({ data, updateData, onNext, onBack, returnToReview }: DeclarationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.agreedToDeclaration)
      newErrors.agreedToDeclaration = 'You must agree to the declaration to proceed';
    if (!data.signature || data.signature.length < 2)
      newErrors.signature = 'Please provide your signature';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Declaration</h2>
        <p className="text-gray-600">Please read and agree to the membership declaration</p>
      </div>

      <div className="mb-8 p-6 bg-gray-50 border-2 border-gray-300">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">Membership Declaration</h3>
        <div className="prose prose-sm text-gray-700 leading-relaxed space-y-4">
          <p>I hereby apply for membership of the <strong>Rivers State Secondary Schools Old Students Association (RSSSOSAA)</strong>.</p>
          <p>I solemnly declare that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All information provided in this application is true, accurate, and complete to the best of my knowledge.</li>
            <li>I am a former student of a secondary school in Rivers State, Nigeria.</li>
            <li>I agree to abide by the constitution, rules, and regulations of the association.</li>
            <li>I will conduct myself in a manner that upholds the dignity and reputation of the association.</li>
            <li>I commit to contributing positively towards achieving the objectives of the association.</li>
            <li>I understand that providing false information may result in the rejection or revocation of my membership.</li>
          </ul>
          <p>I understand that my application will be reviewed and verified by the association&apos;s administrators before final approval.</p>
        </div>
      </div>

      <div className={`mb-6 ${errors.agreedToDeclaration ? 'p-3 bg-red-50 border border-red-300' : ''}`}>
        <Checkbox
          label="I have read and agree to the declaration above"
          checked={data.agreedToDeclaration}
          onChange={(e) => updateData({ agreedToDeclaration: e.target.checked })}
        />
        {errors.agreedToDeclaration && <p className="mt-2 text-sm text-red-600">{errors.agreedToDeclaration}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Applicant's Signature" name="signature" error={errors.signature} required helpText="Type your full name as your digital signature">
          <Input
            id="signature"
            value={data.signature}
            onChange={(e) => updateData({ signature: e.target.value })}
            placeholder="Type your full name"
            error={!!errors.signature}
            className="font-serif text-xl"
          />
        </FormField>
        <FormField label="Date" name="signatureDate" required>
          <Input
            type="date"
            id="signatureDate"
            value={data.signatureDate}
            onChange={(e) => updateData({ signatureDate: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            disabled
            className="bg-gray-100"
          />
        </FormField>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> By providing your digital signature, you are certifying that all information provided is accurate.
        </p>
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto border border-gray-300 text-gray-700 px-8 py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          {returnToReview ? 'Back to Review' : 'Back'}
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto bg-[#1a472a] text-white px-8 py-3 font-medium hover:bg-[#2d5f3f] transition-colors"
        >
          {returnToReview ? 'Save & Return to Review' : 'Review Application'}
        </button>
      </div>
    </form>
  );
}
