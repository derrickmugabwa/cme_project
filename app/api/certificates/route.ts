import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user ID from query params or use current user ID
    const searchParams = request.nextUrl.searchParams;
    let userId = searchParams.get('userId');
    
    // If no userId provided or it's the current user, use the current user's ID
    if (!userId || userId === user.id) {
      userId = user.id;
    } else {
      // Check if current user is admin or faculty to allow viewing other users' certificates
      const { data: profile } = await (await supabase)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
        return NextResponse.json(
          { error: 'Unauthorized to view other users\'s certificates' },
          { status: 403 }
        );
      }
    }
    
    // Fetch certificates for the user
    const { data: certificates, error } = await (await supabase)
      .from('certificates')
      .select(`
        *,
        sessions:session_id(id, title, start_time, end_time)
      `)
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching certificates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch certificates' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ certificates });
  } catch (error) {
    console.error('Error in certificates API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
