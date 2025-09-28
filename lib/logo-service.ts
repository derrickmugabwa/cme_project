import { createClient } from '@/lib/server';

export interface Logo {
  id: string;
  url: string;
  alt_text: string;
  created_at: string;
  updated_at: string;
}

/**
 * Server-side logo fetching service
 * Fetches logo data from Supabase for SSR components
 */
export async function fetchLogo(): Promise<Logo | null> {
  try {
    const supabase = await createClient();
    const { data: logoData, error } = await supabase
      .from('landing_logo')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching logo:', error);
      return null;
    }
    
    return logoData;
  } catch (error) {
    console.error('Error fetching logo:', error);
    return null;
  }
}

/**
 * Client-side logo fetching service (for fallback scenarios)
 * Use this only when SSR is not available
 */
export async function fetchLogoClient(): Promise<Logo | null> {
  try {
    const { createClient } = await import('@/lib/client');
    const supabase = createClient();
    
    const { data: logoData, error } = await supabase
      .from('landing_logo')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching logo:', error);
      return null;
    }
    
    return logoData;
  } catch (error) {
    console.error('Error fetching logo:', error);
    return null;
  }
}
