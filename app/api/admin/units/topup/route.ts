import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// POST /api/admin/units/topup - Admin endpoint to add units to a user
export async function POST(request: Request) {
  try {
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
    const { userId, amount, notes } = body;
    
    // Validate input
    if (!userId || !amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid input. userId and a positive amount are required' },
        { status: 400 }
      );
    }
    
    // Call the database function to top up units
    const { data: result, error: topupError } = await supabase
      .rpc('topup_user_units', {
        p_user_id: userId,
        p_amount: amount,
        p_admin_id: user.id,
        p_notes: notes || `Top-up by admin ${user.id}`
      });
    
    if (topupError) {
      console.error('Error topping up units:', topupError);
      return NextResponse.json(
        { error: 'Failed to top up units' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      transactionId: result.transaction_id,
      updatedUnits: result.units
    });
  } catch (error) {
    console.error('Unexpected error in topup API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
