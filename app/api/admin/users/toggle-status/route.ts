import { createClient } from '@/lib/server';
import { createAdminClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Check if the current user is an admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: currentUser, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const { userId, disabled } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (typeof disabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Disabled status must be a boolean' },
        { status: 400 }
      );
    }
    
    // Update the user's status in Supabase Auth
    const { error } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { disabled } }
    );
    
    if (error) {
      console.error('Error updating user status:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Also update the profile table to reflect the disabled status
    const { error: profileUpdateError } = await adminSupabase
      .from('profiles')
      .update({ disabled })
      .eq('id', userId);
    
    if (profileUpdateError) {
      console.error('Error updating profile status:', profileUpdateError);
      // We don't return an error here since the auth update was successful
      // But we log it for debugging purposes
    }
    
    return NextResponse.json({
      success: true,
      message: disabled ? 'User has been disabled' : 'User has been enabled'
    });
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
