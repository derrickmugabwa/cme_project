import { createClient } from '@/lib/client'

/**
 * Performs a complete logout with proper session cleanup
 * This ensures all client-side state is cleared and prevents
 * previous account data from persisting after logout
 */
export async function performCompleteLogout() {
  const supabase = createClient()
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear any localStorage/sessionStorage data that might persist
    if (typeof window !== 'undefined') {
      // Clear any potential cached data
      localStorage.clear()
      sessionStorage.clear()
      
      // Force a complete page refresh to ensure clean state
      window.location.href = '/auth/login'
    }
  } catch (error) {
    console.error('Error during logout:', error)
    // Even if logout fails, force redirect to clear state
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }
}

/**
 * Performs a complete login redirect with proper session initialization
 * This ensures clean session state after successful authentication
 */
export function performCompleteLogin() {
  if (typeof window !== 'undefined') {
    // Force a complete page refresh to ensure clean session state
    window.location.href = '/dashboard'
  }
}

/**
 * Clears browser cache and forces a clean state
 * Useful for handling session transitions
 */
export function clearBrowserCache() {
  if (typeof window !== 'undefined') {
    // Clear browser cache for the current origin
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
  }
}
