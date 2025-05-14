"use client"

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// Custom Button with rounded corners
const PrimaryButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-purple-600 hover:bg-purple-700 text-white rounded-xl ${className || ''}`} {...props} />
)

interface AppearanceFormProps {
  profile: any
}

export function AppearanceForm({ profile }: AppearanceFormProps) {
  const [theme, setTheme] = useState('light')
  const [fontSize, setFontSize] = useState('normal')
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile.id,
          theme,
          font_size: fontSize,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      
      if (error) throw error
      
      toast({
        title: "Appearance updated",
        description: "Your appearance preferences have been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update appearance preferences",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Select the theme for your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={theme} 
              onValueChange={setTheme}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem 
                  value="light" 
                  id="theme-light" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-checked:border-purple-500 peer-checked:bg-purple-50"
                >
                  <div className="w-full h-24 rounded-lg bg-white border mb-2"></div>
                  <span className="text-sm font-medium">Light</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="dark" 
                  id="theme-dark" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-gray-950 p-4 hover:bg-gray-900 hover:border-gray-700 peer-checked:border-purple-500"
                >
                  <div className="w-full h-24 rounded-lg bg-gray-800 border border-gray-700 mb-2"></div>
                  <span className="text-sm font-medium text-white">Dark</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="system" 
                  id="theme-system" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-gradient-to-r from-white to-gray-900 p-4 hover:from-gray-50 hover:to-gray-800 hover:border-gray-300 peer-checked:border-purple-500"
                >
                  <div className="w-full h-24 rounded-lg bg-gradient-to-r from-white to-gray-800 mb-2"></div>
                  <span className="text-sm font-medium">System</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Font Size</CardTitle>
            <CardDescription>
              Select the font size for your dashboard content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={fontSize} 
              onValueChange={setFontSize}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem 
                  value="small" 
                  id="font-small" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="font-small"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-checked:border-purple-500 peer-checked:bg-purple-50"
                >
                  <span className="text-xs">Small Text</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="normal" 
                  id="font-normal" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="font-normal"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-checked:border-purple-500 peer-checked:bg-purple-50"
                >
                  <span className="text-sm">Normal Text</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="large" 
                  id="font-large" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="font-large"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-checked:border-purple-500 peer-checked:bg-purple-50"
                >
                  <span className="text-base">Large Text</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        
        <div>
          <PrimaryButton type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save preferences'}
          </PrimaryButton>
        </div>
      </div>
    </form>
  )
}
