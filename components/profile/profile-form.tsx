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
  const [username, setUsername] = useState(profile.username || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string>(profile.email || '')
  const [role, setRole] = useState<string>(profile.role || 'student')
  
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
          username,
          bio,
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
          <Label htmlFor="username" className="mb-2 block">Username</Label>
          <StyledInput
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This is your public display name. It can be your real name or a pseudonym. You can only change this once every 30 days.
          </p>
        </div>
        
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
        
        <div>
          <Label htmlFor="role" className="mb-2 block">Role</Label>
          <StyledInput
            id="role"
            value={role === 'student' ? 'Student' : role === 'faculty' ? 'Faculty' : 'Administrator'}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your role determines your access level and permissions in the system.
          </p>
        </div>
        
        <div>
          <Label htmlFor="bio" className="mb-2 block">Bio</Label>
          <StyledTextarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="I own a computer."
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-1">
            You can @mention other users and organizations to link to them.
          </p>
        </div>
        
        {/* URL fields removed */}
      </div>
      
      <div>
        <PrimaryButton type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update profile'}
        </PrimaryButton>
      </div>
    </form>
  )
}
