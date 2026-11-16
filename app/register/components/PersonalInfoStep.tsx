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
import { nigerianLGAsByState, nigerianStates, validateNigerianPhone } from '@/lib/utils/nigeria-data';

interface PersonalInfoStepProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  returnToReview?: boolean;
  emailReadOnly?: boolean;
}

export default function PersonalInfoStep({ data, updateData, onNext, returnToReview, emailReadOnly }: PersonalInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.fullName || data.fullName.length < 3)
      newErrors.fullName = 'Full name must be at least 3 characters';
    if (!data.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = (Date.now() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 15 || age > 100) newErrors.dateOfBirth = 'You must be at least 15 years old';
    }
    if (!data.gender) newErrors.gender = 'Please select your gender';
    if (!validateNigerianPhone(data.phoneNumber)) newErrors.phoneNumber = 'Please enter a valid Nigerian phone number';
    if (!validateNigerianPhone(data.whatsappNumber)) newErrors.whatsappNumber = 'Please enter a valid Nigerian phone number';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) newErrors.email = 'Please enter a valid email address';
    if (!data.residentialAddress || data.residentialAddress.length < 10) newErrors.residentialAddress = 'Please enter your complete residential address';
    if (!data.stateOfOrigin) newErrors.stateOfOrigin = 'Please select your state of origin';
    if (!data.lga) newErrors.lga = 'Please select your LGA';
    if (!data.referredBy?.trim() || data.referredBy.trim().length < 2) newErrors.referredBy = 'Please enter who referred you';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  const getLGAs = () =>
    Object.hasOwn(nigerianLGAsByState, data.stateOfOrigin)
      ? nigerianLGAsByState[data.stateOfOrigin]
      : [];

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">Please provide your basic personal details</p>
      </div>

      {/* Full Name */}
      <div className="mb-6">
        <Label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
          Full Name <span className="text-red-600">*</span>
        </Label>
        <Input
          id="fullName"
          value={data.fullName}
          onChange={(e) => updateData({ fullName: e.target.value })}
          placeholder="Enter your full name as it appears on official documents"
          aria-invalid={!!errors.fullName}
          className={cn('h-11 w-full', errors.fullName && 'border-destructive')}
        />
        {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date of Birth */}
        <div className="mb-6">
          <Label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700 mb-2">
            Date of Birth <span className="text-red-600">*</span>
          </Label>
          <Input
            type="date"
            id="dateOfBirth"
            value={data.dateOfBirth}
            onChange={(e) => updateData({ dateOfBirth: e.target.value })}
            aria-invalid={!!errors.dateOfBirth}
            max={new Date().toISOString().split('T')[0]}
            className={cn('h-11 w-full', errors.dateOfBirth && 'border-destructive')}
          />
          {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
        </div>

        {/* Gender */}
        <div className="mb-6">
          <Label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
            Gender <span className="text-red-600">*</span>
          </Label>
          <Select value={data.gender || ''} onValueChange={(val) => updateData({ gender: val as 'Male' | 'Female' })}>
            <SelectTrigger id="gender" className={cn('h-11 w-full', errors.gender && 'border-destructive')}>
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phone Number */}
        <div className="mb-6">
          <Label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number <span className="text-red-600">*</span>
          </Label>
          <Input
            type="tel"
            id="phoneNumber"
            value={data.phoneNumber}
            onChange={(e) => updateData({ phoneNumber: e.target.value })}
            placeholder="08012345678"
            aria-invalid={!!errors.phoneNumber}
            className={cn('h-11 w-full', errors.phoneNumber && 'border-destructive')}
          />
          <p className="mt-1 text-sm text-gray-500">Format: 080xxxxxxxx or 234xxxxxxxxxx</p>
          {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
        </div>

        {/* WhatsApp Number */}
        <div className="mb-6">
          <Label htmlFor="whatsappNumber" className="block text-sm font-semibold text-gray-700 mb-2">
            WhatsApp Number <span className="text-red-600">*</span>
          </Label>
          <Input
            type="tel"
            id="whatsappNumber"
            value={data.whatsappNumber}
            onChange={(e) => updateData({ whatsappNumber: e.target.value })}
            placeholder="08012345678"
            aria-invalid={!!errors.whatsappNumber}
            className={cn('h-11 w-full', errors.whatsappNumber && 'border-destructive')}
          />
          <p className="mt-1 text-sm text-gray-500">Can be the same as phone number</p>
          {errors.whatsappNumber && <p className="mt-1 text-sm text-red-600">{errors.whatsappNumber}</p>}
        </div>
      </div>

      {/* Email Address */}
      <div className="mb-6">
        <Label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
          Email Address <span className="text-red-600">*</span>
        </Label>
        <Input
          type="email"
          id="email"
          readOnly={emailReadOnly}
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          placeholder="your.email@example.com"
          aria-invalid={!!errors.email}
          className={cn('h-11 w-full', errors.email && 'border-destructive')}
        />
        {emailReadOnly && <p className="mt-1 text-sm text-gray-600">Your registration uses the email on your signed-in account.</p>}
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* Residential Address */}
      <div className="mb-6">
        <Label htmlFor="residentialAddress" className="block text-sm font-semibold text-gray-700 mb-2">
          Residential Address <span className="text-red-600">*</span>
        </Label>
        <Input
          id="residentialAddress"
          value={data.residentialAddress}
          onChange={(e) => updateData({ residentialAddress: e.target.value })}
          placeholder="Enter your complete residential address"
          aria-invalid={!!errors.residentialAddress}
          className={cn('h-11 w-full', errors.residentialAddress && 'border-destructive')}
        />
        <p className="mt-1 text-sm text-gray-500">Your current home address</p>
        {errors.residentialAddress && <p className="mt-1 text-sm text-red-600">{errors.residentialAddress}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* State of Origin */}
        <div className="mb-6">
          <Label htmlFor="stateOfOrigin" className="block text-sm font-semibold text-gray-700 mb-2">
            State of Origin <span className="text-red-600">*</span>
          </Label>
          <Select
            value={data.stateOfOrigin || ''}
            onValueChange={(val) => updateData({ stateOfOrigin: val ?? '', lga: '' })}
          >
            <SelectTrigger id="stateOfOrigin" className={cn('h-11 w-full', errors.stateOfOrigin && 'border-destructive')}>
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {nigerianStates.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.stateOfOrigin && <p className="mt-1 text-sm text-red-600">{errors.stateOfOrigin}</p>}
        </div>

        {/* LGA */}
        <div className="mb-6">
          <Label htmlFor="lga" className="block text-sm font-semibold text-gray-700 mb-2">
            Local Government Area (LGA) <span className="text-red-600">*</span>
          </Label>
          <Select
            value={data.lga || ''}
            onValueChange={(val) => updateData({ lga: val ?? '' })}
            disabled={!data.stateOfOrigin}
          >
            <SelectTrigger id="lga" className={cn('h-11 w-full', errors.lga && 'border-destructive')}>
              <SelectValue placeholder="Select LGA" />
            </SelectTrigger>
            <SelectContent>
              {getLGAs().map(lga => (
                <SelectItem key={lga} value={lga}>{lga}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.lga && <p className="mt-1 text-sm text-red-600">{errors.lga}</p>}
        </div>
      </div>

      {/* Referred By */}
      <div className="mb-6">
        <Label htmlFor="referredBy" className="block text-sm font-semibold text-gray-700 mb-2">
          Who referred you? <span className="text-red-600">*</span>
        </Label>
        <Input
          id="referredBy"
          value={data.referredBy}
          onChange={(e) => updateData({ referredBy: e.target.value })}
          placeholder="Name of the person who referred you to RSSSOSAA"
          required
          maxLength={100}
          aria-invalid={!!errors.referredBy}
          aria-describedby={errors.referredBy ? 'referredBy-error' : undefined}
          className={cn('h-11 w-full', errors.referredBy && 'border-destructive')}
        />
        <p className="mt-1 text-sm text-gray-500">Help us know how you heard about us</p>
        {errors.referredBy && <p id="referredBy-error" className="mt-1 text-sm text-red-600">{errors.referredBy}</p>}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          className="w-full sm:w-auto bg-[#1a472a] text-white px-8 py-3 h-auto font-medium hover:bg-[#2d5f3f] transition-colors"
        >
          {returnToReview ? 'Save & Return to Review' : 'Continue to School Information'}
        </Button>
      </div>
    </form>
  );
}
