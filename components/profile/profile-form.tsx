"use client"

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Custom Input with rounded corners
const StyledInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
  <Input className={`rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${className || ''}`} {...props} />
)

// Custom Textarea with rounded corners
const StyledTextarea = ({ className, ...props }: React.ComponentProps<typeof Textarea>) => (
  <Textarea className={`rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${className || ''}`} {...props} />
)

// Custom Button with rounded corners
const PrimaryButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-purple-600 hover:bg-purple-700 text-white rounded-xl ${className || ''}`} {...props} />
)

interface ProfileFormProps {
  profile: any
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [title, setTitle] = useState(profile.title || '')
  const [country, setCountry] = useState(profile.country || '')
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || '')
  const [professionalCadre, setProfessionalCadre] = useState(profile.professional_cadre || '')
  const [registrationNumber, setRegistrationNumber] = useState(profile.registration_number || '')
  const [professionalBoard, setProfessionalBoard] = useState(profile.professional_board || '')
  const [institution, setInstitution] = useState(profile.institution || '')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string>(profile.email || '')
  const [role, setRole] = useState<string>(profile.role || 'user')
  
  // No URL handlers needed
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio,
          title,
          country,
          phone_number: phoneNumber,
          professional_cadre: professionalCadre,
          registration_number: registrationNumber,
          professional_board: professionalBoard,
          institution,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      
      if (error) throw error
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
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
              <Label htmlFor="fullName" className="mb-2 block">Full Name</Label>
              <StyledInput
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your full name as it appears on official documents.
              </p>
            </div>
            
            <div>
              <Label htmlFor="title" className="mb-2 block">Title</Label>
              <StyledInput
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dr., Prof., Mr., Mrs., etc."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="country" className="mb-2 block">Country</Label>
              <StyledInput
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Kenya, Uganda, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="phoneNumber" className="mb-2 block">Phone Number</Label>
              <StyledInput
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+254 700 000000"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="email" className="mb-2 block">Email</Label>
              <StyledInput
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your email address is used for account recovery and notifications.
              </p>
            </div>
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
              <Label htmlFor="institution" className="mb-2 block">Institution</Label>
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
