"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Users,
  ListChecks,
  AlignLeft,
  Trophy,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuestionOption {
  key: string;
  text: string;
}

interface UserAnswer {
  id: string;
  answer_text: string;
}

interface AdminAnswer {
  id: string;
  answer_text: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string };
}

interface Question {
  id: string;
  question_text: string;
  question_order: number;
  question_type: "free_text" | "multiple_choice";
  options?: QuestionOption[];
  correct_answer?: string | null;
  // User view
  my_answer?: UserAnswer | null;
  // Admin view
  answers?: AdminAnswer[];
  answer_count?: number;
}

interface WebinarQuestionsProps {
  sessionId: string;
  userRole: string | null;
  isEnrolled: boolean;
  userId?: string;
}

// ── Score summary card ────────────────────────────────────────────────────────
function ScoreSummary({ questions, answeredMap }: { questions: Question[]; answeredMap: Record<string, string> }) {
  const mcq = questions.filter((q) => q.question_type === "multiple_choice");
  if (mcq.length === 0) return null;

  const answeredMcq = mcq.filter((q) => answeredMap[q.id]);
  if (answeredMcq.length === 0) return null;

  const correct = answeredMcq.filter((q) => q.correct_answer && answeredMap[q.id] === q.correct_answer).length;
  const total = answeredMcq.length;
  const pct = Math.round((correct / total) * 100);

  const color = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
  const bg = pct >= 80 ? "bg-green-50 border-green-200" : pct >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className={`rounded-lg border p-4 flex items-center gap-4 ${bg}`}>
      <Trophy className={`h-8 w-8 shrink-0 ${color}`} />
      <div className="flex-1">
        <p className={`text-lg font-bold ${color}`}>{pct}% — {correct}/{total} correct</p>
        <p className="text-sm text-muted-foreground">
          {pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort — review the incorrect answers." : "Keep studying — you can retake the questions anytime."}
        </p>
      </div>
      {total < mcq.length && (
        <Badge variant="outline" className="shrink-0">
          {mcq.length - total} unanswered
        </Badge>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WebinarQuestions({ sessionId, userRole, isEnrolled, userId }: WebinarQuestionsProps) {
  const isPrivileged = userRole === "admin" || userRole === "faculty";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User view: text drafts (free_text) + selected option (mcq)
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  // Track submitted answers for display (questionId → answer key/text)
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  // Admin view: expanded answers panels
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── Fetch questions ─────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/questions`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load questions");
      }
      const data = await res.json();
      const qs: Question[] = data.questions ?? [];
      setQuestions(qs);

      // Pre-fill existing answers
      const texts: Record<string, string> = {};
      const opts: Record<string, string> = {};
      const submitted: Record<string, string> = {};

      qs.forEach((q) => {
        if (q.my_answer) {
          if (q.question_type === "multiple_choice") {
            opts[q.id] = q.my_answer.answer_text;
          } else {
            texts[q.id] = q.my_answer.answer_text;
          }
          submitted[q.id] = q.my_answer.answer_text;
        }
      });

      setTextDrafts(texts);
      setSelectedOptions(opts);
      setSubmittedAnswers(submitted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ── Submit answer ───────────────────────────────────────────────────────────
  const handleSubmit = async (q: Question) => {
    const answerText =
      q.question_type === "multiple_choice"
        ? selectedOptions[q.id]
        : (textDrafts[q.id] || "").trim();

    if (!answerText) return;

    setSubmitting((p) => ({ ...p, [q.id]: true }));
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/questions/${q.id}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer_text: answerText }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setSubmittedAnswers((p) => ({ ...p, [q.id]: answerText }));
      // Refresh to get correct_answer revealed
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting((p) => ({ ...p, [q.id]: false }));
    }
  };

  // ── Shared states ───────────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (error) return <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>;
  if (questions.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No questions have been added for this webinar.</p>;

  // Not enrolled user
  if (!isPrivileged && !isEnrolled) {
    return (
      <div className="text-center py-6 space-y-2">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {questions.length} question{questions.length !== 1 ? "s" : ""} available — enroll to answer them.
        </p>
      </div>
    );
  }

  // ── ADMIN / FACULTY VIEW ────────────────────────────────────────────────────
  if (isPrivileged) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{questions.length} question{questions.length !== 1 ? "s" : ""} · click to expand answers</span>
        </div>

        {questions.map((q, i) => {
          const isMcq = q.question_type === "multiple_choice";
          return (
            <div key={q.id} className="border rounded-lg overflow-hidden">
              {/* Question header */}
              <button
                className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                onClick={() => setExpanded((p) => ({ ...p, [q.id]: !p[q.id] }))}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium leading-snug">{q.question_text}</p>
                      <Badge variant={isMcq ? "default" : "secondary"} className="text-[10px] h-4 shrink-0">
                        {isMcq ? <><ListChecks className="h-2.5 w-2.5 mr-0.5" />MCQ</> : <><AlignLeft className="h-2.5 w-2.5 mr-0.5" />Free Text</>}
                      </Badge>
                    </div>
                    {/* MCQ options preview */}
                    {isMcq && q.options && (
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {q.options.map((opt) => (
                          <p key={opt.key} className={`text-xs ${opt.key === q.correct_answer ? "text-green-600 font-semibold" : "text-muted-foreground"}`}>
                            {opt.key === q.correct_answer ? "✓" : "○"} {opt.key}. {opt.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {q.answer_count ?? q.answers?.length ?? 0} answer{(q.answer_count ?? q.answers?.length ?? 0) !== 1 ? "s" : ""}
                  </Badge>
                  {expanded[q.id] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Answers panel */}
              {expanded[q.id] && (
                <div className="border-t bg-muted/20">
                  {!q.answers || q.answers.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-4 py-4">No answers yet.</p>
                  ) : (
                    <div className="divide-y">
                      {q.answers.map((a) => {
                        const isCorrect = isMcq && q.correct_answer && a.answer_text === q.correct_answer;
                        const isWrong = isMcq && q.correct_answer && a.answer_text !== q.correct_answer;
                        return (
                          <div key={a.id} className="px-4 py-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{a.profiles?.full_name || "Unknown User"}</span>
                              <div className="flex items-center gap-2">
                                {isMcq && (
                                  isCorrect
                                    ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">✓ Correct</Badge>
                                    : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">✗ Wrong</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(a.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                            {a.profiles?.email && <p className="text-xs text-muted-foreground">{a.profiles.email}</p>}
                            {isMcq ? (
                              <p className="text-sm font-medium">
                                Selected: <span className={isCorrect ? "text-green-600" : "text-red-600"}>{a.answer_text}</span>
                                {isWrong && <span className="text-muted-foreground ml-2 font-normal">(correct: {q.correct_answer})</span>}
                              </p>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap bg-background rounded p-2 border">{a.answer_text}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── USER VIEW (enrolled) ────────────────────────────────────────────────────
  const mcqAnsweredMap = Object.fromEntries(
    questions
      .filter((q) => q.question_type === "multiple_choice" && submittedAnswers[q.id])
      .map((q) => [q.id, submittedAnswers[q.id]])
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Answer the questions below. You can update your answers at any time.</p>

      {/* Score summary (shown once at least one MCQ is answered) */}
      <ScoreSummary questions={questions} answeredMap={mcqAnsweredMap} />

      {questions.map((q, i) => {
        const isMcq = q.question_type === "multiple_choice";
        const isSaving = submitting[q.id];
        const submitted = submittedAnswers[q.id];
        const isAnswered = !!submitted;

        // For MCQ: determine if correct after submit
        const correctAnswer = q.correct_answer; // null until submitted (API reveals it after)
        const userPicked = isMcq ? selectedOptions[q.id] : undefined;
        const isCorrect = isMcq && isAnswered && correctAnswer && submitted === correctAnswer;
        const isWrong = isMcq && isAnswered && correctAnswer && submitted !== correctAnswer;

        return (
          <div key={q.id} className="space-y-3">
            {/* Question label */}
            <div className="flex items-start gap-2">
              <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium leading-snug">{q.question_text}</p>
                  <Badge variant={isMcq ? "default" : "secondary"} className="text-[10px] h-4">
                    {isMcq ? "MCQ" : "Free Text"}
                  </Badge>
                  {isAnswered && !isMcq && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                </div>
              </div>
            </div>

            <div className="pl-8">
              {isMcq ? (
                /* ── MCQ radio options ── */
                <div className="space-y-2">
                  {(q.options || []).map((opt) => {
                    const isSelected = userPicked === opt.key || (!userPicked && submitted === opt.key);
                    const showCorrect = isAnswered && correctAnswer === opt.key;
                    const showWrong = isAnswered && submitted === opt.key && correctAnswer !== opt.key;

                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isAnswered
                            ? showCorrect
                              ? "border-green-400 bg-green-50"
                              : showWrong
                              ? "border-red-400 bg-red-50"
                              : "border-border opacity-60"
                            : isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt.key}
                          checked={isSelected}
                          disabled={isAnswered || isSaving}
                          onChange={() => setSelectedOptions((p) => ({ ...p, [q.id]: opt.key }))}
                          className="shrink-0 accent-primary"
                        />
                        <span className="font-semibold text-sm w-4 shrink-0">{opt.key}.</span>
                        <span className="text-sm flex-1">{opt.text}</span>
                        {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                        {showWrong && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      </label>
                    );
                  })}

                  {/* Result feedback */}
                  {isAnswered && (
                    <div className={`flex items-center gap-2 text-sm font-medium mt-1 px-1 ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                      {isCorrect ? (
                        <><CheckCircle2 className="h-4 w-4" /> Correct!</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Wrong — the correct answer is <span className="font-bold">{correctAnswer}</span></>
                      )}
                    </div>
                  )}

                  {/* Submit button */}
                  {!isAnswered && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(q)}
                      disabled={!userPicked || isSaving}
                      className="mt-2 gap-1.5 bg-[#008C45] hover:bg-[#006633] text-white"
                    >
                      {isSaving ? <LoadingSpinner size="xs" /> : <Send className="h-3.5 w-3.5" />}
                      Submit Answer
                    </Button>
                  )}

                  {/* Change answer button */}
                  {isAnswered && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSubmittedAnswers((p) => { const n = { ...p }; delete n[q.id]; return n; });
                        setSelectedOptions((p) => ({ ...p, [q.id]: submitted }));
                        setQuestions((qs) => qs.map((item) => item.id === q.id ? { ...item, my_answer: null, correct_answer: null } : item));
                      }}
                      className="mt-1 text-xs h-7"
                    >
                      Change answer
                    </Button>
                  )}
                </div>
              ) : (
                /* ── Free text answer ── */
                <div className="space-y-2">
                  <Textarea
                    value={textDrafts[q.id] || ""}
                    onChange={(e) => setTextDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Type your answer here…"
                    rows={3}
                    className="resize-none text-sm"
                    disabled={isSaving}
                  />
                  <div className="flex items-center justify-between">
                    {isAnswered ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Answer saved — you can update it below.
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not yet answered</span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(q)}
                      disabled={!(textDrafts[q.id] || "").trim() || isSaving}
                      className="gap-1.5 bg-[#008C45] hover:bg-[#006633] text-white"
                    >
                      {isSaving ? <LoadingSpinner size="xs" /> : <Send className="h-3.5 w-3.5" />}
                      {isAnswered ? "Update" : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
