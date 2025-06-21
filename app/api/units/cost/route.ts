import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create a Supabase client for server-side usage
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the current unit cost setting from the database
    const { data, error } = await supabase.rpc('get_current_unit_cost');
    
    if (error) {
      console.error('Error fetching unit cost:', error);
      return NextResponse.json(
        { error: 'Failed to fetch unit cost' },
        { status: 500 }
      );
    }
    
    // Return the unit cost data
    return NextResponse.json({
      cost: data || { cost_per_unit: 1.00, currency: 'KES' }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
