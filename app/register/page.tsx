'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProgressIndicator from '@/components/forms/ProgressIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import PersonalInfoStep from './components/PersonalInfoStep';
import SchoolInfoStep from './components/SchoolInfoStep';
import ProfessionalInfoStep from './components/ProfessionalInfoStep';
import ParticipationStep from './components/ParticipationStep';
import DeclarationStep from './components/DeclarationStep';
import ReviewStep from './components/ReviewStep';

const STEPS = [
  { number: 1, title: 'Personal', subtitle: 'Basic information' },
  { number: 2, title: 'School', subtitle: 'Education history' },
  { number: 3, title: 'Professional', subtitle: 'Current status' },
  { number: 4, title: 'Participation', subtitle: 'Your contribution' },
  { number: 5, title: 'Declaration', subtitle: 'Agreement' },
  { number: 6, title: 'Review', subtitle: 'Check & save' },
];

const STORAGE_KEY = 'rsssosaa_reg_draft';

export interface RegistrationData {
  // Personal Information
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | '';
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  residentialAddress: string;
  stateOfOrigin: string;
  lga: string;
  referredBy: string;

  // School Information
  secondarySchool: string;
  graduationYear: string;
  positionHeldInSchool: string;

  // Professional Information
  currentOccupation: string;
  employmentType: string;
  organizationName: string;
  skills: string[];

  // Participation
  willingToParticipate: boolean;
  contributionAreas: string[];
  otherContributionArea: string;

  // Declaration
  agreedToDeclaration: boolean;
  signature: string;
  signatureDate: string;
}

const EMPTY_FORM: RegistrationData = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  phoneNumber: '',
  whatsappNumber: '',
  email: '',
  residentialAddress: '',
  stateOfOrigin: '',
  lga: '',
  referredBy: '',
  secondarySchool: '',
  graduationYear: '',
  positionHeldInSchool: '',
  currentOccupation: '',
  employmentType: '',
  organizationName: '',
  skills: [],
  willingToParticipate: true,
  contributionAreas: [],
  otherContributionArea: '',
  agreedToDeclaration: false,
  signature: '',
  signatureDate: new Date().toISOString().split('T')[0],
};

function loadDraft(storageKey: string, accountEmail: string): { step: number; data: RegistrationData } {
  try {
    const raw = localStorage.getItem(storageKey) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: 1, data: EMPTY_FORM };
    const parsed = JSON.parse(raw);
    if (parsed.data?.email?.toLowerCase() !== accountEmail.toLowerCase()) return { step: 1, data: EMPTY_FORM };
    return {
      step: Number.isInteger(parsed.step) && parsed.step >= 1 && parsed.step <= STEPS.length ? parsed.step : 1,
      data: { ...EMPTY_FORM, ...parsed.data },
    };
  } catch {
    return { step: 1, data: EMPTY_FORM };
  }
}

function saveDraft(storageKey: string, step: number, data: RegistrationData) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ step, data }));
  } catch {
    // storage unavailable — silent
  }
}

export function clearRegistrationDraft(storageKey = STORAGE_KEY) {
  try {
    localStorage.removeItem(storageKey);
  } catch {}
}

export function RegistrationForm({ embedded = false, onSaved }: { embedded?: boolean; onSaved?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>(EMPTY_FORM);
  // When true, "Edit" from ReviewStep sends you back to review after saving
  const [returnToReview, setReturnToReview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [applicationRef, setApplicationRef] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [accountEmail, setAccountEmail] = useState('');
  const [draftStorageKey, setDraftStorageKey] = useState(STORAGE_KEY);
  const [loadError, setLoadError] = useState('');

  // Load the account before restoring its private local draft and saved form.
  useEffect(() => {
    let cancelled = false;

    // Async DB sync — nested IIFE so the effect itself stays synchronous
    (async () => {
      try {
        const res = await fetch('/api/member/draft', { cache: 'no-store' });
        if (cancelled) return;
        if (res.status === 401) {
          setIsLoggedIn(false);
          return;
        }
        if (res.ok) {
          const dbData = await res.json();
          if (cancelled) return;
          const email = dbData.email || dbData.draft?.email || '';
          const storageKey = `${STORAGE_KEY}:${email.toLowerCase()}`;
          let local = loadDraft(storageKey, email);
          const saved = dbData.profileComplete === true;
          const draft = dbData.draft as (Partial<RegistrationData> & { step?: number }) | null;
          const hasServerDraft = !!draft && Object.keys(draft).some(key => key !== 'email');
          if (!saved && !hasServerDraft && !dbData.applicationRef) {
            clearRegistrationDraft(storageKey);
            clearRegistrationDraft(STORAGE_KEY);
            local = { step: 1, data: EMPTY_FORM };
          }
          setIsLoggedIn(true);
          setAccountEmail(email);
          setDraftStorageKey(storageKey);
          setProfileSaved(saved);
          setPaymentStatus(dbData.paymentStatus || 'unpaid');
          setApplicationRef(dbData.applicationRef || null);
          setFormData({ ...EMPTY_FORM, ...(saved ? {} : local.data), ...draft, email });
          const requestedStep = Number(new URLSearchParams(window.location.search).get('step'));
          const restoredStep = requestedStep >= 1 && requestedStep <= STEPS.length ? requestedStep : saved ? 6 : draft?.step || local.step;
          setCurrentStep(restoredStep >= 1 && restoredStep <= STEPS.length ? restoredStep : 1);
        } else {
          throw new Error('Your saved form could not be loaded.');
        }
      } catch {
        if (!cancelled) setLoadError('Your saved form could not be loaded. Please refresh to try again.');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    saveDraft(draftStorageKey, currentStep, formData);
  }, [currentStep, formData, hydrated, isLoggedIn, draftStorageKey]);

  // Fire-and-forget draft save to server
  const saveDraftToServer = (step: number, data: RegistrationData) => {
    if (!isLoggedIn || profileSaved) return;
    fetch('/api/member/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: data, step }),
    }).catch(() => {});
  };

  const updateFormData = (data: Partial<RegistrationData>) => {
    setFormData(prev => ({ ...prev, ...data, email: accountEmail || data.email || prev.email }));
  };

  const nextStep = () => {
    if (returnToReview) {
      // Coming from an edit — jump straight back to Review (step 6)
      setReturnToReview(false);
      goToStep(6);
    } else if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    saveDraftToServer(currentStep, formData);
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    saveDraftToServer(currentStep, formData);
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    saveDraftToServer(step, formData);
  };

  // Called by ReviewStep when user clicks Edit on a section
  const handleEditFromReview = (step: number) => {
    setReturnToReview(true);
    goToStep(step);
  };

  const progressPercent = Math.round((currentStep / STEPS.length) * 100);

  // Keep incomplete account data out of the form until hydration finishes.
  if (!hydrated) return <div className="py-16 text-center text-neutral-900" role="status">Loading your registration form...</div>;
  if (loadError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">{loadError}</div>;
  if (!isLoggedIn) return <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center text-neutral-900 mt-28 mb-12"><h1 className="text-xl font-bold">Sign in to save your membership form</h1><p className="my-4">Your form and payment stay securely linked to your account.</p><Link href="/login" className="inline-flex rounded-full bg-[#1a472a] px-6 py-3 font-semibold text-white">Sign in</Link></div>;

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#ECEBE6] py-12 pt-28 sm:pt-32'}>
      <div className={embedded ? '' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {profileSaved ? 'Edit Your Registration Form' : 'Membership Registration'}
          </h1>
          <p className="text-lg text-gray-600">
            {profileSaved ? 'Review your saved details and save any changes.' : 'Save your form first, then submit it by paying online or reporting a prior in-person payment.'}
          </p>
          <p className="mt-3 text-sm text-neutral-700">Account email: <strong>{accountEmail}</strong>. Your registration uses this email.</p>
          {!embedded && <Link href="/members/dashboard?tab=edit-form" className="mt-3 inline-block text-sm font-semibold text-[#1a472a] underline">Return to dashboard</Link>}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step indicator */}
        <ProgressIndicator currentStep={currentStep} steps={STEPS} />

        {/* Form Container */}
        <Card className="bg-[#F6F5F0]">
          <CardContent className="p-5 sm:p-8 md:p-12">
            {currentStep === 1 && (
              <PersonalInfoStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                returnToReview={returnToReview}
                emailReadOnly
              />
            )}
            {currentStep === 2 && (
              <SchoolInfoStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                onBack={previousStep}
                returnToReview={returnToReview}
              />
            )}
            {currentStep === 3 && (
              <ProfessionalInfoStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                onBack={previousStep}
                returnToReview={returnToReview}
              />
            )}
            {currentStep === 4 && (
              <ParticipationStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                onBack={previousStep}
                returnToReview={returnToReview}
              />
            )}
            {currentStep === 5 && (
              <DeclarationStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                onBack={previousStep}
                returnToReview={returnToReview}
              />
            )}
            {currentStep === 6 && (
              <ReviewStep
                data={formData}
                onBack={previousStep}
                onEdit={handleEditFromReview}
                applicationRef={applicationRef}
                profileSaved={profileSaved}
                paymentStatus={paymentStatus}
                draftStorageKey={draftStorageKey}
                onSaved={embedded ? () => onSaved?.() : undefined}
              />
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need assistance? Contact us at{' '}
            <a href="mailto:oldstudentsassociation94@gmail.com" className="text-[#1a472a] underline">
              oldstudentsassociation94@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <RegistrationForm />;
}
