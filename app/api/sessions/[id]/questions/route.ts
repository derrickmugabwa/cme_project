import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// GET /api/sessions/[id]/questions
// Returns all questions for a session.
// Admin/faculty: includes all user answers + correct_answer for MCQ.
// Regular users: includes their own answer + correct_answer (shown after answering).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
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

  const isAdminOrFaculty =
    profile?.role === 'admin' || profile?.role === 'faculty';

  const { data: questions, error: questionsError } = await supabase
    .from('session_questions')
    .select('id, session_id, question_text, question_order, question_type, options, correct_answer, created_by, created_at, updated_at')
    .eq('session_id', sessionId)
    .order('question_order', { ascending: true });

  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  if (!questions || questions.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  const questionIds = questions.map((q) => q.id);

  if (isAdminOrFaculty) {
    const { data: answers } = await supabase
      .from('session_question_answers')
      .select('id, question_id, user_id, answer_text, created_at, updated_at, profiles(full_name, email)')
      .in('question_id', questionIds);

    const answersMap: Record<string, any[]> = {};
    (answers || []).forEach((a) => {
      if (!answersMap[a.question_id]) answersMap[a.question_id] = [];
      answersMap[a.question_id].push(a);
    });

    const enriched = questions.map((q) => ({
      ...q,
      answers: answersMap[q.id] || [],
      answer_count: (answersMap[q.id] || []).length,
    }));

    return NextResponse.json({ questions: enriched });
  } else {
    const { data: myAnswers } = await supabase
      .from('session_question_answers')
      .select('id, question_id, answer_text, created_at, updated_at')
      .in('question_id', questionIds)
      .eq('user_id', user.id);

    const myAnswerMap: Record<string, any> = {};
    (myAnswers || []).forEach((a) => {
      myAnswerMap[a.question_id] = a;
    });

    const enriched = questions.map((q) => ({
      ...q,
      my_answer: myAnswerMap[q.id] || null,
      // Expose correct_answer only after the user has answered (educational feedback)
      correct_answer: myAnswerMap[q.id] ? q.correct_answer : null,
    }));

    return NextResponse.json({ questions: enriched });
  }
}

// POST /api/sessions/[id]/questions
// Admin/faculty only — create a question for a session.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
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
  const { question_text, question_order, question_type, options, correct_answer } = body;

  if (!question_text?.trim()) {
    return NextResponse.json({ error: 'question_text is required' }, { status: 400 });
  }

  const type = question_type || 'free_text';

  if (type === 'multiple_choice') {
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Multiple choice questions require at least 2 options' },
        { status: 400 }
      );
    }
    if (!correct_answer) {
      return NextResponse.json(
        { error: 'correct_answer is required for multiple choice questions' },
        { status: 400 }
      );
    }
  }

  const { data: question, error } = await supabase
    .from('session_questions')
    .insert({
      session_id: sessionId,
      question_text: question_text.trim(),
      question_order: question_order ?? 1,
      question_type: type,
      options: type === 'multiple_choice' ? options : null,
      correct_answer: type === 'multiple_choice' ? correct_answer : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question }, { status: 201 });
}
