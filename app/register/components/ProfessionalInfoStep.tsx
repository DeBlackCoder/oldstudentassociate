'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RegistrationData } from '../page';
import { employmentTypes, commonSkills } from '@/lib/utils/nigeria-data';

interface ProfessionalInfoStepProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  returnToReview?: boolean;
}

export default function ProfessionalInfoStep({ data, updateData, onNext, onBack, returnToReview }: ProfessionalInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customSkill, setCustomSkill] = useState('');

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.currentOccupation || data.currentOccupation.length < 2)
      newErrors.currentOccupation = 'Please enter your current occupation';
    if (!data.employmentType)
      newErrors.employmentType = 'Please select your employment type';
    if (data.skills.length === 0)
      newErrors.skills = 'Please select at least one skill';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  const toggleSkill = (skill: string) => {
    const current = [...data.skills];
    const index = current.indexOf(skill);
    if (index > -1) current.splice(index, 1);
    else current.push(skill);
    updateData({ skills: current });
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !data.skills.includes(customSkill.trim())) {
      updateData({ skills: [...data.skills, customSkill.trim()] });
      setCustomSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    updateData({ skills: data.skills.filter(s => s !== skill) });
  };

  const showOrgName = data.employmentType &&
    !['Unemployed', 'Retired', 'Student'].includes(data.employmentType);

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Information</h2>
        <p className="text-gray-600">Tell us about your current occupation and expertise</p>
      </div>

      {/* Current Occupation */}
      <div className="mb-6">
        <Label htmlFor="currentOccupation" className="block text-sm font-semibold text-gray-700 mb-2">
          Current Occupation / Profession <span className="text-red-600">*</span>
        </Label>
        <Input
          id="currentOccupation"
          value={data.currentOccupation}
          onChange={(e) => updateData({ currentOccupation: e.target.value })}
          placeholder="e.g., Software Engineer, Teacher, Entrepreneur"
          aria-invalid={!!errors.currentOccupation}
          className={cn('h-11 w-full', errors.currentOccupation && 'border-destructive')}
        />
        <p className="mt-1 text-sm text-gray-500">Your current job title or professional role</p>
        {errors.currentOccupation && <p className="mt-1 text-sm text-red-600">{errors.currentOccupation}</p>}
      </div>

      {/* Employment Type */}
      <div className="mb-6">
        <Label htmlFor="employmentType" className="block text-sm font-semibold text-gray-700 mb-2">
          Employment Type <span className="text-red-600">*</span>
        </Label>
        <Select
          value={data.employmentType || ''}
          onValueChange={(val) => updateData({ employmentType: val ?? '' })}
        >
          <SelectTrigger id="employmentType" className={cn('h-11 w-full', errors.employmentType && 'border-destructive')}>
            <SelectValue placeholder="Select Employment Type" />
          </SelectTrigger>
          <SelectContent>
            {employmentTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employmentType && <p className="mt-1 text-sm text-red-600">{errors.employmentType}</p>}
      </div>

      {showOrgName && (
        <div className="mb-6">
          <Label htmlFor="organizationName" className="block text-sm font-semibold text-gray-700 mb-2">
            Name of Organization / Business
          </Label>
          <Input
            id="organizationName"
            value={data.organizationName}
            onChange={(e) => updateData({ organizationName: e.target.value })}
            placeholder="Enter organization or business name"
            className="h-11 w-full"
          />
          <p className="mt-1 text-sm text-gray-500">The company, organization, or business where you work</p>
        </div>
      )}

      {/* Skills */}
      <div className="mb-6">
        <Label className="block text-sm font-semibold text-gray-700 mb-2">
          Skills / Areas of Expertise <span className="text-red-600">*</span>
        </Label>
        <p className="mb-3 text-sm text-gray-500">Select or add your professional skills and areas of expertise</p>
        <div className="space-y-4">
          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <Badge key={skill} className="inline-flex items-center gap-1.5 bg-[#1a472a] text-white px-3 py-1 h-auto text-sm rounded-none">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="hover:text-gray-300 ml-1 leading-none" aria-label={`Remove ${skill}`}>×</button>
                </Badge>
              ))}
            </div>
          )}
          <div className="border border-gray-300 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Select from common skills:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commonSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    'text-left px-3 py-2 text-sm border transition-colors',
                    data.skills.includes(skill)
                      ? 'bg-[#1a472a] text-white border-[#1a472a]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  )}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add custom skill"
              className="h-11"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
            />
            <Button type="button" variant="secondary" onClick={addCustomSkill} className="px-6 h-11 font-medium whitespace-nowrap">
              Add Skill
            </Button>
          </div>
        </div>
        {errors.skills && <p className="mt-2 text-sm text-red-600">{errors.skills}</p>}
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto px-8 py-3 h-auto font-medium">
          {returnToReview ? 'Back to Review' : 'Back'}
        </Button>
        <Button type="submit" className="w-full sm:w-auto bg-[#1a472a] text-white px-8 py-3 h-auto font-medium hover:bg-[#2d5f3f] transition-colors">
          {returnToReview ? 'Save & Return to Review' : 'Continue to Participation'}
        </Button>
      </div>
    </form>
  );
}
