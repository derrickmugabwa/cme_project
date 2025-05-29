import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create a Supabase client for use in Route Handlers (API routes)
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Not needed for API routes
        },
        remove(name: string, options: any) {
          // Not needed for API routes
        },
      },
    }
  );
}

// Create a Supabase client for use with request cookies
export function createServerClientFromRequest(requestCookies: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = requestCookies.get(name);
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          // Not needed for API routes
        },
        remove(name: string, options: any) {
          // Not needed for API routes
        },
      },
    }
  );
}
