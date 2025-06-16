import { createClient } from '@supabase/supabase-js';

// Create a Supabase client for server-side operations using the service role key
// This bypasses RLS policies and should be used carefully
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Create a Supabase client for use with request cookies
export function createServerClientFromRequest(requestCookies: any) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'supabase-auth',
        storage: {
          getItem: (name: string) => {
            const cookie = requestCookies.get(name);
            return cookie?.value;
          },
          setItem: (name: string, value: string) => {
            // Not needed for API routes
          },
          removeItem: (name: string) => {
            // Not needed for API routes
          }
        }
      }
    }
  );
}
