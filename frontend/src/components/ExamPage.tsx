"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ExamRunner } from "@/components/ExamRunner";
import { apiJson } from "@/lib/api";

type ExamDetail = {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  questions: {
    id: string;
    prompt: string;
    options: string[];
    order_index: number;
  }[];
};

export function ExamPage({ slug, examId }: { slug: string; examId: string }) {
  const { ready, user } = useAuth();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<ExamDetail>(`/api/exams/${examId}`);
        if (!cancelled) setExam(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar prova.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, examId]);

  if (!ready) return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  if (!user) {
    return <p className="text-sm text-[var(--dm-muted)]">Login obrigatório.</p>;
  }

  return (
    <div className="space-y-6">
      <Link href={`/provas/${slug}`} className="text-sm text-[var(--dm-muted)]">
        ← {slug.replace(/-/g, " ")}
      </Link>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!exam && !error && <p className="text-sm text-[var(--dm-muted)]">Carregando prova...</p>}
      {exam && (
        <>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="mt-2 text-sm text-[var(--dm-muted)]">
              {exam.time_limit_minutes} min · {exam.questions.length} questões
            </p>
            {exam.description && (
              <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                {exam.description}
              </p>
            )}
          </div>
          <ExamRunner slug={slug} exam={exam} />
        </>
      )}
    </div>
  );
}
