import { createClient } from '@/lib/server';
import { createAdminClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    
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
    const { email, password, userData } = await request.json();
    
    if (!email || !password || !userData) {
      return NextResponse.json(
        { error: 'Email, password, and user data are required' },
        { status: 400 }
      );
    }
    
    // Create the user in Supabase Auth using signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      }
    });
    
    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    // Make sure we have a user from the signup process
    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      );
    }
    
    // Create the user profile using admin client to bypass RLS
    const { error: profileCreateError } = await adminSupabase
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          email: email,
          role: userData.role || 'user',
          full_name: userData.full_name || '',
          title: userData.title || '',
          institution: userData.institution || '',
          professional_cadre: userData.professional_cadre || '',
          country: userData.country || '',
          registration_number: userData.registration_number || '',
          professional_board: userData.professional_board || '',
          phone_number: userData.phone_number || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    
    if (profileCreateError) {
      console.error('Error creating user profile:', profileCreateError);
      
      // Note: We can't easily delete the auth user since we're using signUp
      // The user will need to be deleted manually if needed
      
      return NextResponse.json(
        { error: profileCreateError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userData.role || 'user'
      },
      message: 'User created successfully. A confirmation email has been sent.'
    });
  } catch (error: any) {
    console.error('Error in user creation:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while creating the user' },
      { status: 500 }
    );
  }
}
