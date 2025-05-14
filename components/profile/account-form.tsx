"use client"

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// Custom Input with rounded corners
const StyledInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
  <Input className={`rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${className || ''}`} {...props} />
)

// Custom Button with rounded corners
const PrimaryButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-purple-600 hover:bg-purple-700 text-white rounded-xl ${className || ''}`} {...props} />
)

const DangerButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-red-600 hover:bg-red-700 text-white rounded-xl ${className || ''}`} {...props} />
)

interface AccountFormProps {
  profile: any
}

export function AccountForm({ profile }: AccountFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      })
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <StyledInput
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <StyledInput
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <StyledInput
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <PrimaryButton type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </PrimaryButton>
          </form>
        </CardContent>
      </Card>
      
      <Card className="rounded-xl shadow-sm border-red-100">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all of your content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Once you delete your account, there is no going back. Please be certain.
          </p>
        </CardContent>
        <CardFooter>
          <DangerButton>Delete Account</DangerButton>
        </CardFooter>
      </Card>
    </div>
  )
}
