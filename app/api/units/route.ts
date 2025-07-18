import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// GET /api/units - Get current user's unit balance
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Create Supabase client with service role to bypass RLS
    const supabase = createServerSupabaseClient();
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's units
    const { data: userUnits, error: unitsError } = await supabase
      .from('user_units')
      .select('units')
      .eq('user_id', user.id)
      .single();
    
    if (unitsError && unitsError.code !== 'PGRST116') { // Not found error
      console.error('Error fetching user units:', unitsError);
      return NextResponse.json(
        { error: 'Failed to fetch units' },
        { status: 500 }
      );
    }
    
    // If no record found, return 0 units
    const units = userUnits?.units || 0;
    
    return NextResponse.json({ units });
  } catch (error) {
    console.error('Unexpected error in units API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
