'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/client'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  role: string
  email: string
  full_name?: string
}

interface UserContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = async () => {
    try {
      setError(null)
      const supabase = createClient()
      
      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        throw authError
      }

      setUser(authUser)

      if (authUser) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, email, full_name')
          .eq('id', authUser.id)
          .single()

        if (profileError) {
          throw profileError
        }

        setProfile(profileData)
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
      setUser(null)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()

    // Listen for auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUserData()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setIsLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const refetch = async () => {
    setIsLoading(true)
    await fetchUserData()
  }

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
        refetch
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Helper hooks for common use cases
export function useUserRole() {
  const { profile, isLoading } = useUser()
  return {
    role: profile?.role || null,
    isLoading,
    isAdmin: profile?.role === 'admin',
    isFaculty: profile?.role === 'faculty',
    isUser: profile?.role === 'user',
    isAdminOrFaculty: profile?.role === 'admin' || profile?.role === 'faculty'
  }
}
