import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    
    // Get query parameters
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const userId = request.nextUrl.searchParams.get('userId');
    
    // Ensure the user is only checking their own certificate or has admin/faculty role
    if (userId !== user.id) {
      // Check if the user is an admin or faculty
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
        return NextResponse.json(
          { error: 'Unauthorized to check certificates for other users' },
          { status: 403 }
        );
      }
    }
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and User ID are required' },
        { status: 400 }
      );
    }
    
    // Find the certificate for this user and session
    const { data: certificates, error: certificateError } = await supabase
      .from('certificates')
      .select('id, certificate_number, issued_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId);
    
    if (certificateError) {
      console.error('Error fetching certificate:', certificateError);
      return NextResponse.json(
        { error: 'Failed to fetch certificate' },
        { status: 500 }
      );
    }
    
    // Return the certificate if found, or null if not found
    return NextResponse.json({
      certificate: certificates && certificates.length > 0 ? certificates[0] : null
    });
  } catch (error) {
    console.error('Error checking certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
