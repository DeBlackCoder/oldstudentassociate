'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  { number: 6, title: 'Review', subtitle: 'Confirm & submit' },
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

function loadDraft(): { step: number; data: RegistrationData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: 1, data: EMPTY_FORM };
    const parsed = JSON.parse(raw);
    return {
      step: parsed.step ?? 1,
      data: { ...EMPTY_FORM, ...parsed.data },
    };
  } catch {
    return { step: 1, data: EMPTY_FORM };
  }
}

function saveDraft(step: number, data: RegistrationData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // storage unavailable — silent
  }
}

export function clearRegistrationDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>(EMPTY_FORM);
  // When true, "Edit" from ReviewStep sends you back to review after saving
  const [returnToReview, setReturnToReview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [applicationRef, setApplicationRef] = useState<string | null>(null);

  // Restore draft from localStorage on first render (client-only), then sync with DB
  useEffect(() => {
    const { step, data } = loadDraft();
    setCurrentStep(step);
    setFormData(data);
    setHydrated(true);

    // Async DB sync — nested IIFE so the effect itself stays synchronous
    (async () => {
      try {
        const res = await fetch('/api/member/draft');
        if (res.status === 401) {
          setIsLoggedIn(false);
          return;
        }
        if (res.ok) {
          setIsLoggedIn(true);
          const dbData = await res.json();
          if (dbData.profileComplete === true) {
            router.push('/members/dashboard');
            return;
          }
          if (dbData.applicationRef) {
            setApplicationRef(dbData.applicationRef);
          }
          if (dbData.draft !== null && dbData.draft !== undefined) {
            setFormData(prev => ({ ...prev, ...(dbData.draft as Partial<RegistrationData>) }));
            if ((dbData.draft as { step?: number }).step) {
              setCurrentStep((dbData.draft as { step?: number }).step as number);
            }
          }
        }
      } catch {
        // Network error — fall back to localStorage-only mode
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    saveDraft(currentStep, formData);
  }, [currentStep, formData, hydrated]);

  // Fire-and-forget draft save to server
  const saveDraftToServer = (step: number, data: RegistrationData) => {
    if (!isLoggedIn) return;
    fetch('/api/member/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: data, step }),
    }).catch(() => {});
  };

  const updateFormData = (data: Partial<RegistrationData>) => {
    setFormData(prev => ({ ...prev, ...data }));
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

  // Avoid hydration mismatch — render nothing until localStorage is read
  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-[#ECEBE6] py-12 pt-28 sm:pt-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Membership Registration
          </h1>
          <p className="text-lg text-gray-600">
            Join the Rivers State Secondary Schools Old Students Association
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step indicator */}
        <ProgressIndicator currentStep={currentStep} steps={STEPS} />

        {/* Form Container */}
        <Card className="bg-[#F6F5F0]">
          <CardContent className="p-8 md:p-12">
            {currentStep === 1 && (
              <PersonalInfoStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                returnToReview={returnToReview}
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
              />
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need assistance? Contact us at{' '}
            <a href="mailto:oldstudentassociation7@gmail.com" className="text-[#1a472a] underline">
              oldstudentassociation7@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
