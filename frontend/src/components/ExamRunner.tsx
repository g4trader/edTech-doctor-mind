"use client";

import { useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  order_index: number;
};

type ExamDetail = {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  questions: Question[];
};

type SubmitOut = {
  score: number;
  total: number;
  items: {
    question_id: string;
    correct: boolean;
    correct_index: number;
    explanation: string | null;
  }[];
};

export function ExamRunner({
  slug,
  exam,
}: {
  slug: string;
  exam: ExamDetail;
}) {
  const sorted = [...exam.questions].sort((a, b) => a.order_index - b.order_index);
  const [answers, setAnswers] = useState<number[]>(
    () => sorted.map(() => -1),
  );
  const [result, setResult] = useState<SubmitOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (answers.some((value) => value < 0)) {
      setError("Responda todas as questões antes de enviar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<SubmitOut>(`/api/exams/${exam.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <p className="text-lg font-semibold">
          Nota: {result.score}% ({result.total} questões)
        </p>
        <ul className="space-y-4">
          {result.items.map((it, idx) => (
            <li
              key={it.question_id}
              className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-surface)] p-4"
            >
              <p className="text-sm font-medium">
                Questão {idx + 1}{" "}
                <span
                  className={
                    it.correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }
                >
                  {it.correct ? "Correta" : "Incorreta"}
                </span>
              </p>
              {it.explanation && (
                <p className="mt-2 text-sm text-[var(--dm-muted)]">{it.explanation}</p>
              )}
            </li>
          ))}
        </ul>
        <Link
          href={`/provas/${slug}`}
          className="inline-block text-sm font-medium text-[var(--dm-accent)]"
        >
          ← Voltar às provas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {sorted.map((q, qi) => (
        <fieldset
          key={q.id}
          className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-surface)] p-4"
        >
          <legend className="sr-only">Questão {qi + 1}</legend>
          <p className="mb-3 text-sm font-medium leading-relaxed">{q.prompt}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const id = `${q.id}-${oi}`;
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-2 py-2 hover:bg-[var(--dm-bg)] has-[:checked]:border-[var(--dm-accent)]"
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="mt-1"
                    checked={answers[qi] === oi}
                    onChange={() => {
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[qi] = oi;
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm leading-relaxed">{opt}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading}
        className="w-full rounded-2xl bg-[var(--dm-accent)] py-3.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Enviando…" : "Ver resultado"}
      </button>
    </div>
  );
}
