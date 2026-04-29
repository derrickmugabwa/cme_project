-- Migration: Add multiple choice question support
-- Extends session_questions with type, options, and correct_answer columns

ALTER TABLE session_questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'free_text',
  ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS correct_answer TEXT DEFAULT NULL;

-- options stores an array like: [{"key":"A","text":"..."},{"key":"B","text":"..."},...]
-- correct_answer stores the key of the correct option: 'A', 'B', 'C', or 'D'
-- question_type is either 'free_text' or 'multiple_choice'

COMMENT ON COLUMN session_questions.question_type IS 'free_text | multiple_choice';
COMMENT ON COLUMN session_questions.options IS 'Array of {key, text} objects for MCQ options';
COMMENT ON COLUMN session_questions.correct_answer IS 'Key (A/B/C/D) of the correct option for MCQ';
