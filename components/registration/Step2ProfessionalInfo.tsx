'use client';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useRegistration } from '@/contexts/RegistrationContext';
import Link from 'next/link';
import { createClient } from '@/lib/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Validation schema for Step 2
const schema = yup.object().shape({
  professionalCadre: yup.string().required('Professional cadre is required'),
  registrationNumber: yup.string().required('Registration number is required'),
  professionalBoard: yup.string().required('Professional board is required'),
  institution: yup.string().required('Institution is required'),
  acceptedTerms: yup.boolean().oneOf([true], 'You must accept the terms and policy'),
});

export function Step2ProfessionalInfo() {
  const { formData, setFormValue, goToPreviousStep } = useRegistration();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      professionalCadre: formData.professionalCadre,
      registrationNumber: formData.registrationNumber,
      professionalBoard: formData.professionalBoard,
      institution: formData.institution,
      acceptedTerms: formData.acceptedTerms,
    },
  });

  const onSubmit = async (data: any) => {
    // Check if terms are accepted
    if (!data.acceptedTerms) {
      toast.error('You must accept the terms and policy to register');
      return;
    }

    // Update context with form values
    Object.entries(data).forEach(([key, value]) => {
      setFormValue(key as keyof typeof formData, value);
    });

    try {
      // Show loading toast
      const loadingToast = toast.loading('Creating your account...');
      
      const supabase = createClient();
      
      // Construct full name from separate name fields
      const fullName = [formData.firstName, formData.middleName, formData.surname]
        .filter(name => name && name.trim()) // Remove empty/null values
        .join(' ');
      
      console.log('About to sign up user with the following data:', {
        email: formData.email,
        metadata: {
          full_name: fullName,
          first_name: formData.firstName,
          middle_name: formData.middleName,
          surname: formData.surname,
          title: formData.title,
          id_number: formData.idNumber,
          country: formData.country,
          professional_cadre: data.professionalCadre,
          registration_number: data.registrationNumber,
          professional_board: data.professionalBoard,
          phone_number: formData.phoneNumber,
          institution: data.institution,
          accepted_terms: data.acceptedTerms,
          role: 'user',
        }
      });
      
      // Include all user metadata in the sign-up call
      // This will be available to the handle_new_user trigger function
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            // Include all profile data in the user metadata
            full_name: fullName,
            first_name: formData.firstName,
            middle_name: formData.middleName,
            surname: formData.surname,
            title: formData.title,
            id_number: formData.idNumber,
            country: formData.country,
            professional_cadre: data.professionalCadre,
            registration_number: data.registrationNumber,
            professional_board: data.professionalBoard,
            phone_number: formData.phoneNumber,
            institution: data.institution,
            accepted_terms: data.acceptedTerms,
            role: 'user',
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      console.log('Auth signup response:', authData);
      
      if (authError) {
        toast.dismiss(loadingToast);
        toast.error(authError.message);
        throw authError;
      }

      // Dismiss loading toast and show success toast
      toast.dismiss(loadingToast);
      toast.success('Account created successfully!');
      
      // Store email in localStorage for the success page
      localStorage.setItem('registrationEmail', formData.email);
      
      // If sign-up is successful, redirect to success page
      router.push('/auth/sign-up-success');
    } catch (error: unknown) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during registration');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Professional Information</h2>
        <p className="text-sm text-muted-foreground">Please provide your professional details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="professionalCadre">Professional Cadre</Label>
            <Controller
              name="professionalCadre"
              control={control}
              render={({ field }) => (
                <Input
                  id="professionalCadre"
                  type="text"
                  placeholder="e.g. Medical Doctor, Nurse"
                  {...field}
                  className={errors.professionalCadre ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.professionalCadre && <p className="text-sm text-red-500">{errors.professionalCadre.message}</p>}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Controller
              name="registrationNumber"
              control={control}
              render={({ field }) => (
                <Input
                  id="registrationNumber"
                  type="text"
                  placeholder="Professional registration number"
                  {...field}
                  className={errors.registrationNumber ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.registrationNumber && <p className="text-sm text-red-500">{errors.registrationNumber.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="professionalBoard">Professional Board</Label>
            <Controller
              name="professionalBoard"
              control={control}
              render={({ field }) => (
                <Input
                  id="professionalBoard"
                  type="text"
                  placeholder="e.g. Medical Board of Kenya"
                  {...field}
                  className={errors.professionalBoard ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.professionalBoard && <p className="text-sm text-red-500">{errors.professionalBoard.message}</p>}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="institution">Institution of Work</Label>
            <Controller
              name="institution"
              control={control}
              render={({ field }) => (
                <Input
                  id="institution"
                  type="text"
                  placeholder="e.g. Kenyatta National Hospital"
                  {...field}
                  className={errors.institution ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.institution && <p className="text-sm text-red-500">{errors.institution.message}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-6">
          <Controller
            name="acceptedTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="terms"
                checked={field.value}
                onCheckedChange={field.onChange}
                className={errors.acceptedTerms ? 'border-red-300' : ''}
              />
            )}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I accept the <Link href="/terms" className="underline">terms and conditions</Link> and <Link href="/privacy" className="underline">privacy policy</Link>
          </label>
        </div>
        {errors.acceptedTerms && <p className="text-sm text-red-500">{errors.acceptedTerms.message}</p>}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={goToPreviousStep}>
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400">
            {isSubmitting ? 'Creating account...' : 'Complete Registration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
