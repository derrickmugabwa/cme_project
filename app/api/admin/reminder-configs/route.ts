import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/admin/reminder-configs - Get all reminder configurations
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch reminder configurations
    const { data: configs, error } = await supabase
      .from('reminder_configurations')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching reminder configs:', error);
      return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
    }

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error in reminder configs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/reminder-configs - Create new reminder configuration
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      reminder_type,
      minutes_before,
      display_name,
      email_subject_template,
      is_enabled,
      sort_order
    } = body;

    // Validate required fields
    if (!reminder_type || !display_name || minutes_before === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if reminder type already exists
    const { data: existing } = await supabase
      .from('reminder_configurations')
      .select('id')
      .eq('reminder_type', reminder_type)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Reminder type already exists' }, { status: 409 });
    }

    // Create new configuration
    const { data: newConfig, error } = await supabase
      .from('reminder_configurations')
      .insert({
        reminder_type,
        minutes_before,
        display_name,
        email_subject_template: email_subject_template || `Reminder: {session_title}`,
        is_enabled: is_enabled ?? true,
        sort_order: sort_order ?? 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder config:', error);
      return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
    }

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error('Error in reminder configs POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/reminder-configs - Update reminder configuration
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Update configuration
    const { data: updatedConfig, error } = await supabase
      .from('reminder_configurations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder config:', error);
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    if (!updatedConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error in reminder configs PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/reminder-configs - Delete reminder configuration
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    // Delete configuration
    const { error } = await supabase
      .from('reminder_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder config:', error);
      return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in reminder configs DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
