'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Logo } from '@/lib/logo-service'

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  logo: Logo | null;
}

export function LoginForm({ logo, className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Show loading toast
    const loadingToast = toast.loading('Logging in...')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        toast.dismiss(loadingToast)
        toast.error(error.message)
        setError(error.message)
        return
      }
      
      // Check if the user is disabled
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get the user's profile to check disabled status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('disabled')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error('Error checking user status:', profileError)
        } else if (profile?.disabled) {
          // User is disabled, sign them out and show error
          await supabase.auth.signOut()
          toast.dismiss(loadingToast)
          toast.error('Your account has been disabled. Please contact an administrator.')
          setError('Your account has been disabled. Please contact an administrator.')
          return
        }
      }
      
      // Show success toast
      toast.dismiss(loadingToast)
      toast.success('Logged in successfully!')
      
      // Redirect to the dashboard after successful login
      router.push('/dashboard')
    } catch (error: unknown) {
      toast.dismiss(loadingToast)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden">
        {/* Green Header Bar with Logo */}
        <div 
          className="w-full py-4 px-6 flex items-center justify-center"
          style={{ backgroundColor: '#008C45' }}
        >
          <Link href="/" className="flex items-center">
            <div className="relative h-8 w-40 md:h-10 md:w-48">
              {logo ? (
                <Image
                  src={logo.url}
                  alt={logo.alt_text}
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="h-8 w-40 md:h-10 md:w-48 bg-white/20 animate-pulse rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm md:text-base">METROPOLIS</span>
                </div>
              )}
            </div>
          </Link>
        </div>
        
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white" 
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/sign-up" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
