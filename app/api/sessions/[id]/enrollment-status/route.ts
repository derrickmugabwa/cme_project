import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/sessions/:id/enrollment-status - Check if user is enrolled
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Await the params object to access its properties
    const { id: sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is enrolled
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('session_enrollments')
      .select('id, created_at, status, units_spent')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();
    
    if (enrollmentError && enrollmentError.code !== 'PGRST116') { // Not found error
      console.error('Error checking enrollment status:', enrollmentError);
      return NextResponse.json(
        { error: 'Failed to check enrollment status' },
        { status: 500 }
      );
    }
    
    // Get unit requirement for the session
    const { data: unitRequirement } = await supabase
      .from('session_unit_requirements')
      .select('units_required')
      .eq('session_id', sessionId)
      .single();
    
    // Get user's current units
    const { data: userUnits } = await supabase
      .from('user_units')
      .select('units')
      .eq('user_id', user.id)
      .single();
    
    return NextResponse.json({
      enrolled: !!enrollment,
      enrollment: enrollment || null,
      unitRequirement: unitRequirement?.units_required || 1,
      userUnits: userUnits?.units || 0
    });
  } catch (error) {
    console.error('Unexpected error in enrollment status API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
