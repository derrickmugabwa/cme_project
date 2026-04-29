"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Trash2,
  Plus,
  HelpCircle,
  ListChecks,
  AlignLeft,
} from "lucide-react";

export interface QuestionOption {
  key: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface DraftQuestion {
  id?: string;
  question_text: string;
  question_order: number;
  question_type: "free_text" | "multiple_choice";
  options?: QuestionOption[];
  correct_answer?: string;
}

const OPTION_KEYS = ["A", "B", "C", "D"];

// ── MCQ option inputs (module-level to preserve focus between re-renders) ─────
function McqOptions({
  opts,
  correctKey,
  onChange: onOptsChange,
  onCorrectChange,
}: {
  opts: QuestionOption[];
  correctKey: string;
  onChange: (opts: QuestionOption[]) => void;
  onCorrectChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Options — click the circle to mark the correct answer
      </p>
      {OPTION_KEYS.map((key) => {
        const opt = opts.find((o) => o.key === key) || { key, text: "" };
        const isCorrect = correctKey === key;
        return (
          <div key={key} className="flex items-center gap-2">
            {/* Correct answer selector */}
            <button
              type="button"
              onClick={() => onCorrectChange(key)}
              className={`shrink-0 h-5 w-5 rounded-full border-2 transition-colors ${
                isCorrect
                  ? "border-green-600 bg-green-600"
                  : "border-gray-300 hover:border-green-400"
              }`}
              title={isCorrect ? "Correct answer" : "Mark as correct"}
            >
              {isCorrect && (
                <svg className="h-3 w-3 mx-auto text-white" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <span className="shrink-0 text-xs font-bold text-muted-foreground w-4">{key}.</span>
            <Input
              value={opt.text}
              onChange={(e) => {
                const updated = OPTION_KEYS.map((k) => ({
                  key: k,
                  text:
                    k === key
                      ? e.target.value
                      : (opts.find((o) => o.key === k)?.text ?? ""),
                }));
                onOptsChange(updated);
              }}
              placeholder={`Option ${key}`}
              className="h-8 text-sm flex-1"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground mt-1">
        ✓ <span className="text-green-600 font-medium">Green circle</span> = correct answer
      </p>
    </div>
  );
}

// ── Blank form state ─────────────────────────────────────────────────────────
interface QuestionManagerProps {
  sessionId?: string;
  initialQuestions?: DraftQuestion[];
  onChange?: (questions: DraftQuestion[]) => void;
}

// ── Blank form state ─────────────────────────────────────────────────────────
function blankForm() {
  return {
    question_text: "",
    question_type: "free_text" as "free_text" | "multiple_choice",
    options: OPTION_KEYS.map((k) => ({ key: k, text: "" })),
    correct_answer: "A",
  };
}

export default function QuestionManager({
  sessionId,
  initialQuestions = [],
  onChange,
}: QuestionManagerProps) {
  const [questions, setQuestions] = useState<DraftQuestion[]>(initialQuestions);

  // New-question form state
  const [form, setForm] = useState(blankForm());

  // Editing an existing question
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editForm, setEditForm] = useState(blankForm());

  const [saving, setSaving] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number>(-1);
  const [deletingIndex, setDeletingIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  const notify = (updated: DraftQuestion[]) => onChange?.(updated);

  // ── Validate MCQ form ──────────────────────────────────────────────────────
  const validateMcq = (f: typeof form) => {
    if (!f.question_text.trim()) return "Question text is required.";
    if (f.question_type === "multiple_choice") {
      const filled = f.options.filter((o) => o.text.trim());
      if (filled.length < 2) return "At least 2 options must be filled in.";
      if (!f.correct_answer) return "Please select the correct answer.";
    }
    return null;
  };

  // ── ADD ────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const validationError = validateMcq(form);
    if (validationError) { setError(validationError); return; }
    setError(null);

    const order = questions.length + 1;
    const payload: Omit<DraftQuestion, "id"> = {
      question_text: form.question_text.trim(),
      question_order: order,
      question_type: form.question_type,
      ...(form.question_type === "multiple_choice"
        ? {
            options: form.options.filter((o) => o.text.trim()),
            correct_answer: form.correct_answer,
          }
        : {}),
    };

    if (sessionId) {
      setSaving(true);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add question");
        const updated = [...questions, { ...data.question } as DraftQuestion];
        setQuestions(updated);
        notify(updated);
      } catch (err: any) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setSaving(false);
    } else {
      const updated = [...questions, payload as DraftQuestion];
      setQuestions(updated);
      notify(updated);
    }
    setForm(blankForm());
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const handleDelete = async (index: number) => {
    const q = questions[index];
    setError(null);

    if (sessionId && q.id) {
      setDeletingIndex(index);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/questions/${q.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete");
        }
      } catch (err: any) {
        setError(err.message);
        setDeletingIndex(-1);
        return;
      }
      setDeletingIndex(-1);
    }

    const updated = questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, question_order: i + 1 }));
    setQuestions(updated);
    notify(updated);
    if (editingIndex === index) { setEditingIndex(-1); }
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const startEdit = (index: number) => {
    const q = questions[index];
    setEditingIndex(index);
    setEditForm({
      question_text: q.question_text,
      question_type: q.question_type || "free_text",
      options:
        q.options && q.options.length
          ? OPTION_KEYS.map((k) => ({
              key: k,
              text: q.options!.find((o) => o.key === k)?.text ?? "",
            }))
          : OPTION_KEYS.map((k) => ({ key: k, text: "" })),
      correct_answer: q.correct_answer || "A",
    });
  };

  const cancelEdit = () => { setEditingIndex(-1); };

  const saveEdit = async (index: number) => {
    const validationError = validateMcq(editForm);
    if (validationError) { setError(validationError); return; }
    setError(null);

    const q = questions[index];
    const payload = {
      question_text: editForm.question_text.trim(),
      question_type: editForm.question_type,
      options:
        editForm.question_type === "multiple_choice"
          ? editForm.options.filter((o) => o.text.trim())
          : null,
      correct_answer:
        editForm.question_type === "multiple_choice" ? editForm.correct_answer : null,
    };

    if (sessionId && q.id) {
      setSavingIndex(index);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
      } catch (err: any) {
        setError(err.message);
        setSavingIndex(-1);
        return;
      }
      setSavingIndex(-1);
    }

    const updated = questions.map((item, i) =>
      i === index ? { ...item, ...payload, options: payload.options ?? undefined, correct_answer: payload.correct_answer ?? undefined } : item
    );
    setQuestions(updated);
    notify(updated);
    setEditingIndex(-1);
  };

  // ── REORDER ────────────────────────────────────────────────────────────────
  const move = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= questions.length) return;

    const updated = [...questions];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    const reordered = updated.map((q, i) => ({ ...q, question_order: i + 1 }));
    setQuestions(reordered);
    notify(reordered);

    if (editingIndex === index) setEditingIndex(swapIndex);
    else if (editingIndex === swapIndex) setEditingIndex(index);

    if (sessionId) {
      await Promise.all(
        [reordered[index], reordered[swapIndex]]
          .filter((q) => q.id)
          .map((q) =>
            fetch(`/api/sessions/${sessionId}/questions/${q.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question_order: q.question_order }),
            })
          )
      );
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <HelpCircle className="h-4 w-4 shrink-0" />
        <span>Questions are visible to enrolled users. Multiple choice shows a results summary after submission.</span>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Question list */}
      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No questions yet. Add one below.
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => {
            const isEditingThis = editingIndex === i;
            const isDeletingThis = deletingIndex === i;
            const isSavingThis = savingIndex === i;
            const isMcq = q.question_type === "multiple_choice";

            return (
              <Card key={q.id ?? `draft-${i}`} className="border shadow-none">
                <CardContent className="p-3">
                  {isEditingThis ? (
                    /* ── Edit form ── */
                    <div className="space-y-3">
                      {/* Type tabs */}
                      <div className="flex gap-2">
                        {(["free_text", "multiple_choice"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditForm((f) => ({ ...f, question_type: t }))}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              editForm.question_type === t
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary"
                            }`}
                          >
                            {t === "free_text" ? <AlignLeft className="h-3 w-3" /> : <ListChecks className="h-3 w-3" />}
                            {t === "free_text" ? "Free Text" : "Multiple Choice"}
                          </button>
                        ))}
                      </div>

                      <Input
                        value={editForm.question_text}
                        onChange={(e) => setEditForm((f) => ({ ...f, question_text: e.target.value }))}
                        placeholder="Question text"
                        className="text-sm"
                        autoFocus
                      />

                      {editForm.question_type === "multiple_choice" && (
                        <McqOptions
                          opts={editForm.options}
                          correctKey={editForm.correct_answer}
                          onChange={(opts) => setEditForm((f) => ({ ...f, options: opts }))}
                          onCorrectChange={(key) => setEditForm((f) => ({ ...f, correct_answer: key }))}
                        />
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => saveEdit(i)} disabled={isSavingThis} className="h-7 px-3 text-xs">
                          {isSavingThis ? "Saving…" : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 px-3 text-xs">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="text-sm cursor-pointer hover:text-primary leading-snug"
                            onClick={() => startEdit(i)}
                            title="Click to edit"
                          >
                            <span className="font-medium text-muted-foreground mr-1.5">Q{i + 1}.</span>
                            {q.question_text}
                          </p>
                          <Badge variant={isMcq ? "default" : "secondary"} className="text-[10px] h-4 shrink-0">
                            {isMcq ? "MCQ" : "Free Text"}
                          </Badge>
                        </div>
                        {isMcq && q.options && (
                          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                            {q.options.map((opt) => (
                              <p key={opt.key} className={`text-xs ${opt.key === q.correct_answer ? "text-green-600 font-semibold" : "text-muted-foreground"}`}>
                                {opt.key === q.correct_answer ? "✓" : "○"} {opt.key}. {opt.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(i, "up")} disabled={i === 0} title="Move up">↑</Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(i, "down")} disabled={i === questions.length - 1} title="Move down">↓</Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDelete(i)}
                          disabled={isDeletingThis}
                          title="Delete"
                        >
                          {isDeletingThis ? <span className="text-xs">…</span> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add new question form ── */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add New Question</p>

        {/* Type selector */}
        <div className="flex gap-2">
          {(["free_text", "multiple_choice"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, question_type: t }))}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                form.question_type === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {t === "free_text" ? <AlignLeft className="h-3 w-3" /> : <ListChecks className="h-3 w-3" />}
              {t === "free_text" ? "Free Text" : "Multiple Choice"}
            </button>
          ))}
        </div>

        {/* Question text */}
        <Input
          value={form.question_text}
          onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
          placeholder="Enter your question…"
          onKeyDown={(e) => e.key === "Enter" && form.question_type === "free_text" && handleAdd()}
          disabled={saving}
          className="text-sm"
        />

        {/* MCQ options */}
        {form.question_type === "multiple_choice" && (
          <McqOptions
            opts={form.options}
            correctKey={form.correct_answer}
            onChange={(opts) => setForm((f) => ({ ...f, options: opts }))}
            onCorrectChange={(key) => setForm((f) => ({ ...f, correct_answer: key }))}
          />
        )}

        <Button
          type="button"
          onClick={handleAdd}
          disabled={!form.question_text.trim() || saving}
          className="w-full gap-1.5"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Adding…" : "Add Question"}
        </Button>
      </div>
    </div>
  );
}
