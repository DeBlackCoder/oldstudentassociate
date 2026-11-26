'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RegistrationData } from '../page';
import { schoolPositions } from '@/lib/utils/nigeria-data';

interface SchoolInfoStepProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  returnToReview?: boolean;
}

export default function SchoolInfoStep({ data, updateData, onNext, onBack, returnToReview }: SchoolInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.secondarySchool || data.secondarySchool.length < 3)
      newErrors.secondarySchool = 'Please enter your secondary school name';
    const year = parseInt(data.graduationYear);
    const currentYear = new Date().getFullYear();
    if (!data.graduationYear || year < 1960 || year > currentYear)
      newErrors.graduationYear = `Graduation year must be between 1960 and ${currentYear}`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">School Information</h2>
        <p className="text-gray-600">Tell us about your secondary school education</p>
      </div>

      {/* Secondary School */}
      <div className="mb-6">
        <Label htmlFor="secondarySchool" className="block text-sm font-semibold text-gray-700 mb-2">
          Name of Secondary School <span className="text-red-600">*</span>
        </Label>
        <Input
          id="secondarySchool"
          value={data.secondarySchool}
          onChange={(e) => updateData({ secondarySchool: e.target.value })}
          placeholder="e.g., Government Secondary School Port Harcourt"
          aria-invalid={!!errors.secondarySchool}
          className={cn('h-11 w-full', errors.secondarySchool && 'border-destructive')}
        />
        <p className="mt-1 text-sm text-gray-500">
          Enter the full name of the secondary school you attended in Rivers State
        </p>
        {errors.secondarySchool && <p className="mt-1 text-sm text-red-600">{errors.secondarySchool}</p>}
      </div>

      {/* Graduation Year */}
      <div className="mb-6">
        <Label htmlFor="graduationYear" className="block text-sm font-semibold text-gray-700 mb-2">
          Year of Graduation <span className="text-red-600">*</span>
        </Label>
        <Select
          value={data.graduationYear || ''}
          onValueChange={(val) => updateData({ graduationYear: val ?? '' })}
        >
          <SelectTrigger id="graduationYear" className={cn('h-11 w-full', errors.graduationYear && 'border-destructive')}>
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-sm text-gray-500">The year you completed your secondary education</p>
        {errors.graduationYear && <p className="mt-1 text-sm text-red-600">{errors.graduationYear}</p>}
      </div>

      {/* Position Held in School */}
      <div className="mb-6">
        <Label htmlFor="positionHeldInSchool" className="block text-sm font-semibold text-gray-700 mb-2">
          Position Held in School (Optional)
        </Label>
        <Select
          value={data.positionHeldInSchool || ''}
          onValueChange={(val) => updateData({ positionHeldInSchool: val ?? '' })}
        >
          <SelectTrigger id="positionHeldInSchool" className="h-11 w-full">
            <SelectValue placeholder="Select a position or Not applicable" />
          </SelectTrigger>
          <SelectContent>
            {schoolPositions.map(pos => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-sm text-gray-500">Any leadership position you held during your time in school</p>
      </div>

      {data.positionHeldInSchool === 'Other' && (
        <div className="mb-6">
          <Label htmlFor="positionHeldInSchoolCustom" className="block text-sm font-semibold text-gray-700 mb-2">
            Please Specify Position <span className="text-red-600">*</span>
          </Label>
          <Input
            id="positionHeldInSchoolCustom"
            value={data.positionHeldInSchool === 'Other' ? '' : data.positionHeldInSchool}
            onChange={(e) => updateData({ positionHeldInSchool: e.target.value })}
            placeholder="Enter the position you held"
            className="h-11 w-full"
          />
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-auto px-8 py-3 h-auto font-medium"
        >
          {returnToReview ? 'Back to Review' : 'Back'}
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto bg-[#1a472a] text-white px-8 py-3 h-auto font-medium hover:bg-[#2d5f3f] transition-colors"
        >
          {returnToReview ? 'Save & Return to Review' : 'Continue to Professional Information'}
        </Button>
      </div>
    </form>
  );
}
