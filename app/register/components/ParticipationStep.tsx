'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistrationData } from '../page';
import { contributionAreas } from '@/lib/utils/nigeria-data';

interface ParticipationStepProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  returnToReview?: boolean;
}

export default function ParticipationStep({ data, updateData, onNext, onBack, returnToReview }: ParticipationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (data.willingToParticipate && data.contributionAreas.includes('Other') && !data.otherContributionArea)
      newErrors.otherContributionArea = 'Please specify your contribution area';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  const toggleContributionArea = (area: string) => {
    const current = [...data.contributionAreas];
    const index = current.indexOf(area);
    if (index > -1) current.splice(index, 1);
    else current.push(area);
    updateData({ contributionAreas: current });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Participation &amp; Contribution</h2>
        <p className="text-gray-600">How would you like to contribute to the association?</p>
      </div>

      <div className="mb-8 p-6 bg-gray-50 border border-gray-200">
        <p className="font-medium text-gray-900 mb-4">Are you willing to participate in association activities?</p>
        <RadioGroup
          value={data.willingToParticipate ? 'yes' : 'no'}
          onValueChange={(val) => {
            const willing = val === 'yes';
            updateData(
              willing
                ? { willingToParticipate: true }
                : { willingToParticipate: false, contributionAreas: [], otherContributionArea: '' }
            );
          }}
          className="space-y-3"
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <RadioGroupItem value="yes" />
            <span className="text-gray-700">Yes, I am willing to participate</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <RadioGroupItem value="no" />
            <span className="text-gray-700">No, not at this time</span>
          </label>
        </RadioGroup>
      </div>

      {data.willingToParticipate && (
        <div className="mb-6">
          <Label className="block text-sm font-semibold text-gray-700 mb-2">Areas You Would Like to Contribute</Label>
          <p className="mb-3 text-sm text-gray-500">Select one or more areas where you can contribute your time, expertise, or resources</p>
          <div className="space-y-3 border border-gray-300 p-4">
            {contributionAreas.map((area) => (
              <div key={area} className="flex items-center gap-3">
                <Checkbox
                  id={`area-${area}`}
                  checked={data.contributionAreas.includes(area)}
                  onCheckedChange={() => toggleContributionArea(area)}
                />
                <Label htmlFor={`area-${area}`} className="cursor-pointer font-normal text-gray-700">{area}</Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.contributionAreas.includes('Other') && (
        <div className="mb-6">
          <Label htmlFor="otherContributionArea" className="block text-sm font-semibold text-gray-700 mb-2">
            Please Specify Other Contribution Area <span className="text-red-600">*</span>
          </Label>
          <Input
            id="otherContributionArea"
            value={data.otherContributionArea}
            onChange={(e) => updateData({ otherContributionArea: e.target.value })}
            placeholder="Describe how you would like to contribute"
            aria-invalid={!!errors.otherContributionArea}
            className={cn('h-11 w-full', errors.otherContributionArea && 'border-destructive')}
          />
          {errors.otherContributionArea && <p className="mt-1 text-sm text-red-600">{errors.otherContributionArea}</p>}
        </div>
      )}

      {data.willingToParticipate && data.contributionAreas.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Thank you for your willingness to contribute!</strong> Your participation helps strengthen our community.
          </p>
        </div>
      )}

      {!data.willingToParticipate && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            That&apos;s okay! You can still be a member and benefit from association activities. You may choose to participate at any time in the future.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto px-8 py-3 h-auto font-medium">
          {returnToReview ? 'Back to Review' : 'Back'}
        </Button>
        <Button type="submit" className="w-full sm:w-auto bg-[#1a472a] text-white px-8 py-3 h-auto font-medium hover:bg-[#2d5f3f] transition-colors">
          {returnToReview ? 'Save & Return to Review' : 'Continue to Declaration'}
        </Button>
      </div>
    </form>
  );
}
