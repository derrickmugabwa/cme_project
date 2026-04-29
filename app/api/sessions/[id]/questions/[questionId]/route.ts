import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// PATCH /api/sessions/[id]/questions/[questionId]
// Admin/faculty only — update question text, order, type, options, or correct_answer.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'faculty') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.question_text !== undefined) updates.question_text = body.question_text.trim();
  if (body.question_order !== undefined) updates.question_order = body.question_order;
  if (body.question_type !== undefined) updates.question_type = body.question_type;
  if (body.options !== undefined) updates.options = body.options;
  if (body.correct_answer !== undefined) updates.correct_answer = body.correct_answer;

  const { data: question, error } = await supabase
    .from('session_questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question });
}

// DELETE /api/sessions/[id]/questions/[questionId]
// Admin/faculty only — remove a question (cascades to answers).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'faculty') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('session_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
