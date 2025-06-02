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
    const { userId, sendEmail = true, newPassword } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // First, get the user's email from the profiles table
    const { data: userData, error: userError } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (userError || !userData?.email) {
      console.error('Error finding user email:', userError);
      return NextResponse.json(
        { error: userError?.message || 'User email not found' },
        { status: 400 }
      );
    }
    
    // If newPassword is provided, update the password directly
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }
      
      // Update the user's password directly
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );
      
      if (updateError) {
        console.error('Error updating user password:', updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    }
    
    // If no new password is provided, generate a password reset link
    const { data, error } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: userData.email,
    });
    
    if (error) {
      console.error('Error generating password reset link:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // If sendEmail is true, the link will be sent automatically
    // If not, return the link in the response
    return NextResponse.json({
      success: true,
      message: sendEmail 
        ? 'Password reset email sent successfully' 
        : 'Password reset link generated successfully',
      ...(sendEmail ? {} : { resetLink: data.properties.action_link })
    });
  } catch (error: any) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
