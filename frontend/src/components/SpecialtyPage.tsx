"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api";

type SpecialtyDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  topics: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
  }[];
  contents: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    estimated_minutes: number;
    topic_title: string;
    completed: boolean;
  }[];
  exams: {
    id: string;
    title: string;
    description: string | null;
    time_limit_minutes: number;
    question_count: number;
  }[];
};

export function SpecialtyPage({ slug }: { slug: string }) {
  const { ready, user } = useAuth();
  const [data, setData] = useState<SpecialtyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const response = await apiJson<SpecialtyDetail>(`/api/library/specialties/${slug}`);
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar especialidade.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, slug]);

  if (!ready) return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  if (!user) {
    return (
      <p className="text-sm text-[var(--dm-muted)]">
        A biblioteca é liberada após autenticação.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/conteudos" className="text-sm text-[var(--dm-muted)]">
        ← Biblioteca
      </Link>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-[var(--dm-muted)]">Carregando trilha...</p>}
      {data && (
        <>
          <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
            <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
              {data.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.topics.map((topic) => (
                <span
                  key={topic.id}
                  className="rounded-full border border-[var(--dm-border)] bg-[var(--dm-bg)] px-3 py-1 text-xs text-[var(--dm-muted)]"
                >
                  {topic.title}
                </span>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">Conteúdos da trilha</h2>
              {data.contents.map((content) => (
                <Link
                  key={content.id}
                  href={`/conteudos/item/${content.id}`}
                  className="block rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-5 transition hover:border-[var(--dm-accent)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                        {content.topic_title}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">{content.title}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${content.completed ? "bg-emerald-100 text-emerald-700" : "bg-[var(--dm-bg)] text-[var(--dm-muted)]"}`}
                    >
                      {content.completed ? "Concluído" : `${content.estimated_minutes} min`}
                    </span>
                  </div>
                  {content.summary && (
                    <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                      {content.summary}
                    </p>
                  )}
                </Link>
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">Simulados</h2>
              {data.exams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/provas/${data.slug}/${exam.id}`}
                  className="block rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-5"
                >
                  <h3 className="text-lg font-semibold">{exam.title}</h3>
                  <p className="mt-2 text-sm text-[var(--dm-muted)]">
                    {exam.question_count} questões · {exam.time_limit_minutes} min
                  </p>
                  {exam.description && (
                    <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                      {exam.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
