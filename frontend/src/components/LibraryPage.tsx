"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api";

type SpecialtyCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  topic_count: number;
  content_count: number;
  exam_count: number;
};

export function LibraryPage() {
  const { ready, user } = useAuth();
  const [items, setItems] = useState<SpecialtyCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await apiJson<SpecialtyCard[]>("/api/library");
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar biblioteca.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready) {
    return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  }

  if (!user) {
    return (
      <div className="rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-8">
        <h1 className="text-3xl font-semibold tracking-tight">Biblioteca médica</h1>
        <p className="mt-3 text-sm text-[var(--dm-muted)]">
          Entre na plataforma para acessar as trilhas por especialidade.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-[var(--dm-accent)] px-5 py-3 text-sm font-medium text-white"
        >
          Entrar agora
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Biblioteca de conteúdos</h1>
        <p className="mt-2 text-sm text-[var(--dm-muted)]">
          Especialidades estruturadas para estudo contínuo, revisão e recuperação de lacunas.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-[var(--dm-muted)]">Carregando trilhas...</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/conteudos/${item.slug}`}
            className="rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--dm-accent)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <span className="rounded-full bg-[var(--dm-bg)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--dm-muted)]">
                {item.content_count} conteúdos
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
              {item.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--dm-muted)]">
              <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                {item.topic_count} temas
              </span>
              <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                {item.exam_count} provas
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
