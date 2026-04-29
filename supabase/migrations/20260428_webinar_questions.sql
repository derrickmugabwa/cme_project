-- Migration: Webinar Questions & Answers
-- Adds session_questions and session_question_answers tables

-- ============================================================
-- 1. session_questions
-- ============================================================
CREATE TABLE session_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_order  INTEGER NOT NULL DEFAULT 1,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;

-- Everyone (including enrolled users) can read questions
CREATE POLICY "Anyone can view session questions"
  ON session_questions
  FOR SELECT
  USING (true);

-- Only admins and faculty can create questions
CREATE POLICY "Admins and faculty can create questions"
  ON session_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- Only admins and faculty can update questions
CREATE POLICY "Admins and faculty can update questions"
  ON session_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- Only admins can delete questions
CREATE POLICY "Admins can delete questions"
  ON session_questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- ============================================================
-- 2. session_question_answers
-- ============================================================
CREATE TABLE session_question_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id),
  answer_text   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

ALTER TABLE session_question_answers ENABLE ROW LEVEL SECURITY;

-- Users can view their own answers
CREATE POLICY "Users can view their own answers"
  ON session_question_answers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins and faculty can view all answers
CREATE POLICY "Admins and faculty can view all answers"
  ON session_question_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- Enrolled users can submit their own answers
CREATE POLICY "Enrolled users can insert answers"
  ON session_question_answers
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM session_enrollments se
      JOIN session_questions sq ON sq.id = question_id
      WHERE se.user_id = auth.uid()
      AND se.session_id = sq.session_id
    )
  );

-- Users can update their own answers
CREATE POLICY "Users can update their own answers"
  ON session_question_answers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. Helper index for performance
-- ============================================================
CREATE INDEX idx_session_questions_session_id ON session_questions(session_id);
CREATE INDEX idx_session_question_answers_question_id ON session_question_answers(question_id);
CREATE INDEX idx_session_question_answers_user_id ON session_question_answers(user_id);
