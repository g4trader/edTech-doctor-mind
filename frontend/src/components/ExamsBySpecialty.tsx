"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api";

type ExamSummary = {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  question_count: number;
};

export function ExamsBySpecialty({ slug }: { slug: string }) {
  const { ready, user } = useAuth();
  const [items, setItems] = useState<ExamSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<ExamSummary[]>(`/api/exams/specialties/${slug}/exams`);
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar simulados.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, slug]);

  if (!ready) return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  if (!user) {
    return <p className="text-sm text-[var(--dm-muted)]">Login obrigatório.</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/provas" className="text-sm text-[var(--dm-muted)]">
        ← Especialidades
      </Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight capitalize">
          {slug.replace(/-/g, " ")}
        </h1>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/provas/${slug}/${item.id}`}
            className="block rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6"
          >
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-[var(--dm-muted)]">
              {item.question_count} questões · {item.time_limit_minutes} min
            </p>
            {item.description && (
              <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                {item.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
