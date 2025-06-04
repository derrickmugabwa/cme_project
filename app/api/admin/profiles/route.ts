import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// Define interface for profile with units
interface ProfileWithUnits {
  id: any;
  full_name: any;
  email: any;
  role: any;
  units?: number;
}

// GET /api/admin/profiles - Get all profiles with optional unit balances
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnits = searchParams.get('includeUnits') === 'true';
    
    const supabase = await createClient();
    
    // Get the current user (admin)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }
    
    // If units are requested, fetch them for all users
    if (includeUnits) {
      const { data: userUnits, error: unitsError } = await supabase
        .from('user_units')
        .select('user_id, units');
      
      if (unitsError) {
        console.error('Error fetching user units:', unitsError);
        return NextResponse.json(
          { error: 'Failed to fetch user units' },
          { status: 500 }
        );
      }
      
      // Create a map of user_id to units
      const unitsMap = new Map();
      userUnits?.forEach(unit => {
        unitsMap.set(unit.user_id, unit.units);
      });
      
      // Add units to profiles
      profiles?.forEach(profile => {
        // Use type assertion to tell TypeScript that profile can have units
        (profile as ProfileWithUnits).units = unitsMap.get(profile.id) || 0;
      });
    }
    
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Unexpected error in profiles API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
