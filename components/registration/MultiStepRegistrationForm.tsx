'use client';

import { Card, CardContent } from '@/components/ui/card';
import { RegistrationProvider, useRegistration } from '@/contexts/RegistrationContext';
import { Step1BasicInfo } from './Step1BasicInfo';
import { Step2ProfessionalInfo } from './Step2ProfessionalInfo';

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex justify-center mb-6">
      <div className="flex items-center space-x-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
          1
        </div>
        <div className="h-0.5 w-8 bg-gray-200">
          {/* Divider */}
        </div>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
          2
        </div>
      </div>
    </div>
  );
}

// Form content based on current step
function FormContent() {
  const { currentStep } = useRegistration();

  return (
    <>
      <StepIndicator currentStep={currentStep} />
      {currentStep === 1 && <Step1BasicInfo />}
      {currentStep === 2 && <Step2ProfessionalInfo />}
    </>
  );
}

// Main multi-step registration form component
export function MultiStepRegistrationForm() {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <Card className="w-full">
        <CardContent className="p-6">
          <RegistrationProvider>
            <FormContent />
          </RegistrationProvider>
        </CardContent>
      </Card>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/auth/login" className="text-primary hover:underline font-medium">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
