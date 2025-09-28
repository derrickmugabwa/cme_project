'use client';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRegistration } from '@/contexts/RegistrationContext';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { CountryCombobox } from '@/components/ui/country-combobox';

// Validation schema for Step 1
const schema = yup.object().shape({
  email: yup.string().email('Invalid email format').required('Email is required'),
  title: yup.string().required('Title is required'),
  firstName: yup.string().required('First name is required'),
  middleName: yup.string(), // Optional field
  surname: yup.string().required('Surname is required'),
  idNumber: yup.string().required('ID number is required'),
  country: yup.string().required('Country is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  repeatPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

export function Step1BasicInfo() {
  const { formData, setFormValue, goToNextStep } = useRegistration();
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: formData.email,
      title: formData.title,
      firstName: formData.firstName,
      middleName: formData.middleName,
      surname: formData.surname,
      idNumber: formData.idNumber,
      country: formData.country,
      phoneNumber: formData.phoneNumber,
      password: formData.password,
      repeatPassword: formData.repeatPassword,
    },
  });

  const password = watch('password');

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  // Handle password change with validation - store errors but don't show toast yet
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    const errors = validatePassword(newPassword);
    setPasswordErrors(errors);
    // No toast messages during typing - they'll only appear on form submission
  };

  const onSubmit = (data: any) => {
    // Collect all validation errors
    const validationErrors = [];
    
    // Validate password requirements
    const passwordErrors = validatePassword(data.password);
    if (passwordErrors.length > 0) {
      // Add all password errors to the validation errors list
      validationErrors.push(...passwordErrors);
    }
    
    // Check if passwords match
    if (data.password !== data.repeatPassword) {
      validationErrors.push('Passwords do not match');
    }
    
    // If there are validation errors, show the first one and return
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    
    // Update context with form values
    Object.entries(data).forEach(([key, value]) => {
      setFormValue(key as keyof typeof formData, value);
    });

    // Show success toast
    toast.success('Basic information saved');
    
    // Move to next step
    goToNextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Basic Information</h2>
        <p className="text-sm text-muted-foreground">Please provide your personal details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...field}
                className={errors.email ? 'border-red-300' : ''}
              />
            )}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className={errors.title ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Select a title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr">Dr.</SelectItem>
                    <SelectItem value="Prof">Prof.</SelectItem>
                    <SelectItem value="Mr">Mr.</SelectItem>
                    <SelectItem value="Mrs">Mrs.</SelectItem>
                    <SelectItem value="Ms">Ms.</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="firstName">First Name</Label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...field}
                  className={errors.firstName ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="middleName">Middle Name (Optional)</Label>
            <Controller
              name="middleName"
              control={control}
              render={({ field }) => (
                <Input
                  id="middleName"
                  type="text"
                  placeholder="Middle name"
                  {...field}
                  className={errors.middleName ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.middleName && <p className="text-sm text-red-500">{errors.middleName.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="surname">Surname</Label>
            <Controller
              name="surname"
              control={control}
              render={({ field }) => (
                <Input
                  id="surname"
                  type="text"
                  placeholder="Doe"
                  {...field}
                  className={errors.surname ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.surname && <p className="text-sm text-red-500">{errors.surname.message}</p>}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="idNumber">ID Number</Label>
          <Controller
            name="idNumber"
            control={control}
            render={({ field }) => (
              <Input
                id="idNumber"
                type="text"
                placeholder="Enter your national ID number"
                {...field}
                className={errors.idNumber ? 'border-red-300' : ''}
              />
            )}
          />
          {errors.idNumber && <p className="text-sm text-red-500">{errors.idNumber.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <CountryCombobox
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search and select your country..."
                  error={!!errors.country}
                />
              )}
            />
            {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+254 XXX XXX XXX"
                  {...field}
                  className={errors.phoneNumber ? 'border-red-300' : ''}
                />
              )}
            />
            {errors.phoneNumber && <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>}
          </div>
        </div>

        <div className="grid gap-2">
          <h3 className="text-md font-medium mb-2">Security</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="password"
                      placeholder="Create a password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handlePasswordChange(e);
                      }}
                      className={errors.password ? 'border-red-300 pr-10' : 'pr-10'}
                    />
                  )}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              {/* Password validation requirements are now shown via toast notifications */}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="repeatPassword">Repeat Password</Label>
              <div className="relative">
                <Controller
                  name="repeatPassword"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="repeatPassword"
                      type={showRepeatPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      {...field}
                      className={errors.repeatPassword ? 'border-red-300 pr-10' : 'pr-10'}
                    />
                  )}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                  tabIndex={-1}
                >
                  {showRepeatPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.repeatPassword && <p className="text-sm text-red-500">{errors.repeatPassword.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Continue</Button>
        </div>
      </form>
    </div>
  );
}
