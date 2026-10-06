interface Step {
  number: number;
  title: string;
  subtitle: string;
}

interface ProgressIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export default function ProgressIndicator({ currentStep, steps }: ProgressIndicatorProps) {
  return (
    <div className="mb-12">
      {/* Mobile Progress Bar */}
      <div className="lg:hidden mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {steps[currentStep - 1].title}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#1a472a] transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Progress Steps */}
      <div className="hidden lg:flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;

          return (
            <div key={stepNumber} className="flex-1 flex flex-col items-center relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute top-6 left-1/2 w-full h-0.5 bg-gray-200">
                  <div 
                    className={`h-full transition-all duration-300 ${isCompleted ? 'bg-[#1a472a] w-full' : 'bg-transparent w-0'}`}
                  />
                </div>
              )}

              {/* Step Circle */}
              <div className="relative z-10 mb-3">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg
                  transition-all duration-300
                  ${isActive ? 'bg-[#1a472a] text-white ring-4 ring-[#1a472a] ring-opacity-20' : ''}
                  ${isCompleted ? 'bg-[#16a34a] text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                `}>
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{String(stepNumber).padStart(2, '0')}</span>
                  )}
                </div>
              </div>

              {/* Step Label */}
              <div className="text-center">
                <div className={`
                  text-sm font-semibold mb-1
                  ${isActive ? 'text-[#1a472a]' : 'text-gray-600'}
                `}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
