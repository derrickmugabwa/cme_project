import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/units - Get current user's unit balance
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
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
