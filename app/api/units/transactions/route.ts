import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// GET /api/units/transactions - Get user's transaction history
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Create Supabase client with service role to bypass RLS
    const supabase = createServerSupabaseClient();
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's transactions with related profile data for created_by
    const { data: transactions, error: transactionsError } = await supabase
      .from('unit_transactions')
      .select(`
        id,
        amount,
        transaction_type,
        session_id,
        notes,
        created_at,
        created_by,
        profiles:created_by(full_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false});
    
    if (transactionsError) {
      console.error('Error fetching user transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Unexpected error in transactions API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
