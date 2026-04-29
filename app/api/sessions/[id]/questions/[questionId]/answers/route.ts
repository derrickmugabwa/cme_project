import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// GET /api/sessions/[id]/questions/[questionId]/answers
// Admin/faculty only — retrieve all answers for a specific question.
export async function GET(
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

  const { data: answers, error } = await supabase
    .from('session_question_answers')
    .select(
      'id, answer_text, created_at, updated_at, user_id, profiles(full_name, email)'
    )
    .eq('question_id', questionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ answers: answers ?? [] });
}

// POST /api/sessions/[id]/questions/[questionId]/answers
// Enrolled user — submit or update their answer (upsert by question_id + user_id).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id: sessionId, questionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the user is enrolled in this session
  const { data: enrollment } = await supabase
    .from('session_enrollments')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json(
      { error: 'You must be enrolled to answer questions' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { answer_text } = body;

  if (!answer_text?.trim()) {
    return NextResponse.json(
      { error: 'answer_text is required' },
      { status: 400 }
    );
  }

  // Upsert: update if exists, insert if not
  const { data: answer, error } = await supabase
    .from('session_question_answers')
    .upsert(
      {
        question_id: questionId,
        user_id: user.id,
        answer_text: answer_text.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'question_id,user_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ answer }, { status: 201 });
}
