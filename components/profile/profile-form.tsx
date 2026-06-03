"use client"

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CountryCombobox } from '@/components/ui/country-combobox'

// Custom Input with rounded corners
const StyledInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
  <Input className={`rounded-xl border-gray-300 focus:border-green-600 focus:ring-green-600 ${className || ''}`} {...props} />
)

// Custom Textarea with rounded corners
const StyledTextarea = ({ className, ...props }: React.ComponentProps<typeof Textarea>) => (
  <Textarea className={`rounded-xl border-gray-300 focus:border-green-600 focus:ring-green-600 ${className || ''}`} {...props} />
)

// Custom Button with rounded corners
const PrimaryButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-green-600 hover:bg-green-700 text-white rounded-xl ${className || ''}`} {...props} />
)

interface ProfileData {
  id: string
  email?: string | null
  full_name?: string | null
  first_name?: string | null
  middle_name?: string | null
  surname?: string | null
  bio?: string | null
  title?: string | null
  id_number?: string | null
  country?: string | null
  phone_number?: string | null
  professional_cadre?: string | null
  registration_number?: string | null
  professional_board?: string | null
  institution?: string | null
  accepted_terms?: boolean | null
  role?: string | null
}

interface ProfileFormProps {
  profile: ProfileData
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const fullNameParts = (profile.full_name || '').trim().split(/\s+/).filter(Boolean)
  const fallbackFirstName = fullNameParts[0] || ''
  const fallbackMiddleName = fullNameParts.length > 2 ? fullNameParts.slice(1, -1).join(' ') : ''
  const fallbackSurname = fullNameParts.length > 1 ? fullNameParts[fullNameParts.length - 1] : ''

  const [firstName, setFirstName] = useState(profile.first_name || fallbackFirstName)
  const [middleName, setMiddleName] = useState(profile.middle_name || fallbackMiddleName)
  const [surname, setSurname] = useState(profile.surname || fallbackSurname)
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [title, setTitle] = useState(profile.title || '')
  const [idNumber, setIdNumber] = useState(profile.id_number || '')
  const [country, setCountry] = useState(profile.country || '')
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || '')
  const [professionalCadre, setProfessionalCadre] = useState(profile.professional_cadre || '')
  const [registrationNumber, setRegistrationNumber] = useState(profile.registration_number || '')
  const [professionalBoard, setProfessionalBoard] = useState(profile.professional_board || '')
  const [institution, setInstitution] = useState(profile.institution || '')
  const [acceptedTerms, setAcceptedTerms] = useState(Boolean(profile.accepted_terms))
  const [isLoading, setIsLoading] = useState(false)
  const role = profile.role || 'user'
  const generatedFullName = [firstName, middleName, surname]
    .map((name) => name.trim())
    .filter(Boolean)
    .join(' ')
  
  // No URL handlers needed
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          surname: surname.trim(),
          full_name: generatedFullName || fullName.trim(),
          bio,
          title,
          id_number: idNumber.trim(),
          country,
          phone_number: phoneNumber.trim(),
          professional_cadre: professionalCadre.trim(),
          registration_number: registrationNumber.trim(),
          professional_board: professionalBoard.trim(),
          institution: institution.trim(),
          accepted_terms: acceptedTerms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      
      if (error) throw error
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-background rounded-xl border p-6 shadow-sm">
      <div className="space-y-4">
        {/* Personal Information Section */}
        <div className="border-b pb-4 mb-4">
          <h3 className="text-lg font-medium mb-4">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="mb-2 block">Title</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger id="title" className="rounded-xl border-gray-300">
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
            </div>
            
            <div>
              <Label htmlFor="firstName" className="mb-2 block">First Name</Label>
              <StyledInput
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="middleName" className="mb-2 block">Middle Name (Optional)</Label>
              <StyledInput
                id="middleName"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle name"
              />
            </div>
            
            <div>
              <Label htmlFor="surname" className="mb-2 block">Surname</Label>
              <StyledInput
                id="surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="fullName" className="mb-2 block">Full Name</Label>
              <StyledInput
                id="fullName"
                value={generatedFullName || fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="bg-gray-50"
                disabled={Boolean(generatedFullName)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Automatically built from your name fields.
              </p>
            </div>
            
            <div>
              <Label htmlFor="idNumber" className="mb-2 block">ID Number</Label>
              <StyledInput
                id="idNumber"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter your national ID number"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="country" className="mb-2 block">Country</Label>
              <CountryCombobox
                value={country}
                onValueChange={setCountry}
                placeholder="Search and select your country..."
                className="rounded-xl border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="phoneNumber" className="mb-2 block">Phone Number</Label>
              <StyledInput
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+254 XXX XXX XXX"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="email" className="mb-2 block">Email</Label>
              <StyledInput
                id="email"
                value={profile.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your email address is used for account recovery and notifications.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="acceptedTerms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              disabled={profile.accepted_terms === true}
            />
            <Label htmlFor="acceptedTerms" className="text-sm font-medium leading-none">
              Accepted terms and privacy policy
            </Label>
          </div>
        </div>
        
        {/* Professional Information Section */}
        <div className="border-b pb-4 mb-4">
          <h3 className="text-lg font-medium mb-4">Professional Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="professionalCadre" className="mb-2 block">Professional Cadre</Label>
              <StyledInput
                id="professionalCadre"
                value={professionalCadre}
                onChange={(e) => setProfessionalCadre(e.target.value)}
                placeholder="e.g. Medical Doctor, Nurse"
              />
            </div>
            
            <div>
              <Label htmlFor="registrationNumber" className="mb-2 block">Registration Number</Label>
              <StyledInput
                id="registrationNumber"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Professional registration number"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="professionalBoard" className="mb-2 block">Professional Board</Label>
              <StyledInput
                id="professionalBoard"
                value={professionalBoard}
                onChange={(e) => setProfessionalBoard(e.target.value)}
                placeholder="e.g. Medical Board of Kenya"
              />
            </div>
            
            <div>
              <Label htmlFor="institution" className="mb-2 block">Institution of Work</Label>
              <StyledInput
                id="institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Kenyatta National Hospital"
              />
            </div>
          </div>
        </div>
        
        {/* System Information Section */}
        <div className="border-b pb-4 mb-4">
          <h3 className="text-lg font-medium mb-4">System Information</h3>
          
          <div>
            <Label htmlFor="role" className="mb-2 block">Role</Label>
            <StyledInput
              id="role"
              value={role === 'user' ? 'User' : role === 'faculty' ? 'Faculty' : 'Administrator'}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your role determines your access level and permissions in the system.
            </p>
          </div>
        </div>
        
        {/* Additional Information Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Additional Information</h3>
          
          <div>
            <Label htmlFor="bio" className="mb-2 block">Bio</Label>
            <StyledTextarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Share a brief description about yourself and your professional background.
            </p>
          </div>
        </div>
      </div>
      
      <div>
        <PrimaryButton type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update profile'}
        </PrimaryButton>
      </div>
    </form>
  )
}
