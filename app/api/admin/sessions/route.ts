import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/admin/sessions - Get all sessions with optional unit requirements
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnitRequirements = searchParams.get('includeUnitRequirements') === 'true';
    
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
    
    // Fetch all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, description, start_time, end_time')
      .order('start_time', { ascending: false });
    
    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }
    
    // If unit requirements are requested, fetch them for all sessions
    if (includeUnitRequirements) {
      const { data: unitRequirements, error: requirementsError } = await supabase
        .from('session_unit_requirements')
        .select('session_id, units_required');
      
      if (requirementsError) {
        console.error('Error fetching unit requirements:', requirementsError);
        return NextResponse.json(
          { error: 'Failed to fetch unit requirements' },
          { status: 500 }
        );
      }
      
      // Create a map of session_id to units_required
      const requirementsMap = new Map();
      unitRequirements?.forEach(req => {
        requirementsMap.set(req.session_id, req.units_required);
      });
      
      // Add units_required to sessions
      sessions?.forEach((session: any) => {
        session.units_required = requirementsMap.get(session.id) || 1; // Default to 1 if not set
      });
    }
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Unexpected error in sessions API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
