import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Create a Supabase client for use in Route Handlers (API routes)
export function createServerSupabaseClient() {
  // Get the cookies - cast to the correct type to avoid TypeScript errors
  const cookieStore = cookies() as unknown as ReadonlyRequestCookies;
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Access the cookie store synchronously
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
