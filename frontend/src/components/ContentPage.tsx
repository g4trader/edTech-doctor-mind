"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api";

type ContentDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  estimated_minutes: number;
  specialty_name: string;
  topic: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
  };
  subtopic: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
  } | null;
  completed: boolean;
  minutes_spent: number;
};

export function ContentPage({ contentId }: { contentId: string }) {
  const { ready, user } = useAuth();
  const [data, setData] = useState<ContentDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await apiJson<ContentDetail>(`/api/contents/${contentId}`);
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao abrir conteúdo.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, contentId]);

  const markComplete = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/contents/${data.id}/progress`, {
        method: "POST",
        body: JSON.stringify({
          completed: !data.completed,
          minutes_spent: Math.max(data.minutes_spent, data.estimated_minutes),
        }),
      });
      setData({
        ...data,
        completed: !data.completed,
        minutes_spent: Math.max(data.minutes_spent, data.estimated_minutes),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar progresso.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  if (!user) {
    return (
      <p className="text-sm text-[var(--dm-muted)]">
        O conteúdo completo fica disponível após autenticação.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/conteudos" className="text-sm text-[var(--dm-muted)]">
        ← Biblioteca
      </Link>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <>
          <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-accent)]">
                  {data.specialty_name} · {data.topic.title}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.title}</h1>
              </div>
              <button
                type="button"
                onClick={() => void markComplete()}
                disabled={saving}
                className={`rounded-full px-5 py-3 text-sm font-medium ${data.completed ? "border border-[var(--dm-border)]" : "bg-[var(--dm-accent)] text-white"}`}
              >
                {saving ? "Salvando..." : data.completed ? "Marcar como pendente" : "Marcar como concluído"}
              </button>
            </div>
            {data.summary && (
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--dm-muted)]">
                {data.summary}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--dm-muted)]">
              <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                {data.estimated_minutes} min
              </span>
              <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                {data.completed ? "Concluído" : "Em progresso"}
              </span>
              {data.subtopic && (
                <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                  {data.subtopic.title}
                </span>
              )}
            </div>
          </section>

          <article className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-8">
            <div className="space-y-5 text-sm leading-8 text-[var(--dm-fg)]">
              {data.body.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        </>
      )}
    </div>
  );
}
