import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for the registration form data
type RegistrationFormData = {
  // Step 1 - Basic Information
  email: string;
  title: string;
  firstName: string;
  middleName: string;
  surname: string;
  idNumber: string;
  country: string;
  phoneNumber: string;
  password: string;
  repeatPassword: string;
  
  // Step 2 - Professional Information
  professionalCadre: string;
  registrationNumber: string;
  professionalBoard: string;
  institution: string;
  acceptedTerms: boolean;
};

// Define the context type
type RegistrationContextType = {
  formData: RegistrationFormData;
  setFormValue: (key: keyof RegistrationFormData, value: any) => void;
  currentStep: number;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetForm: () => void;
};

// Create the initial form data
const initialFormData: RegistrationFormData = {
  email: '',
  title: '',
  firstName: '',
  middleName: '',
  surname: '',
  idNumber: '',
  country: '',
  phoneNumber: '',
  password: '',
  repeatPassword: '',
  professionalCadre: '',
  registrationNumber: '',
  professionalBoard: '',
  institution: '',
  acceptedTerms: false,
};

// Create the context
const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

// Create a provider component
export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);

  // Update a single form field
  const setFormValue = (key: keyof RegistrationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Navigate to the next step
  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 2)); // We have 2 steps total
  };

  // Navigate to the previous step
  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Reset the form
  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  return (
    <RegistrationContext.Provider
      value={{
        formData,
        setFormValue,
        currentStep,
        goToNextStep,
        goToPreviousStep,
        resetForm,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

// Create a hook to use the registration context
export function useRegistration() {
  const context = useContext(RegistrationContext);
  
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  
  return context;
}
