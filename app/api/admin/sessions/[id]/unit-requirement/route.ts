import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/admin/sessions/:id/unit-requirement - Get unit requirement for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get the unit requirement for the session
    const { data: unitRequirement, error: requirementError } = await supabase
      .from('session_unit_requirements')
      .select('id, units_required, created_at, updated_at')
      .eq('session_id', sessionId)
      .single();
    
    if (requirementError && requirementError.code !== 'PGRST116') { // Not found error
      console.error('Error fetching unit requirement:', requirementError);
      return NextResponse.json(
        { error: 'Failed to fetch unit requirement' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      unitRequirement: unitRequirement || { units_required: 1 }
    });
  } catch (error) {
    console.error('Unexpected error in unit requirement API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/sessions/:id/unit-requirement - Update unit requirement for a session
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Parse request body
    const body = await request.json();
    const { unitsRequired } = body;
    
    // Validate input
    if (typeof unitsRequired !== 'number' || unitsRequired < 0) {
      return NextResponse.json(
        { error: 'Invalid input. unitsRequired must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Check if requirement exists
    const { data: existingRequirement } = await supabase
      .from('session_unit_requirements')
      .select('id')
      .eq('session_id', sessionId)
      .single();
    
    let result;
    
    if (existingRequirement) {
      // Update existing requirement
      const { data, error: updateError } = await supabase
        .from('session_unit_requirements')
        .update({
          units_required: unitsRequired,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating unit requirement:', updateError);
        return NextResponse.json(
          { error: 'Failed to update unit requirement' },
          { status: 500 }
        );
      }
      
      result = data;
    } else {
      // Create new requirement
      const { data, error: insertError } = await supabase
        .from('session_unit_requirements')
        .insert({
          session_id: sessionId,
          units_required: unitsRequired
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating unit requirement:', insertError);
        return NextResponse.json(
          { error: 'Failed to create unit requirement' },
          { status: 500 }
        );
      }
      
      result = data;
    }
    
    return NextResponse.json({
      success: true,
      unitRequirement: result
    });
  } catch (error) {
    console.error('Unexpected error in unit requirement API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
