"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api";

type Cohort = {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  seats_left: number;
  meeting_url: string | null;
  access_instructions: string | null;
  viewer_enrolled: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    description: string;
    price_cents: number;
    specialty_name: string | null;
    mentor: {
      id: string;
      name: string;
      slug: string;
      title: string;
      bio: string;
    };
  };
};

export function MentorshipHub() {
  const { ready, user } = useAuth();
  const [items, setItems] = useState<Cohort[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<Cohort[]>("/api/mentorships/cohorts");
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar mentorias.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const enroll = async (cohortId: string) => {
    setLoadingId(cohortId);
    setError(null);
    try {
      const updated = await apiJson<Cohort>(`/api/mentorships/cohorts/${cohortId}/enroll`, {
        method: "POST",
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na inscrição.");
    } finally {
      setLoadingId(null);
    }
  };

  if (!ready) return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  if (!user) {
    return (
      <p className="text-sm text-[var(--dm-muted)]">
        Entre na plataforma para explorar mentorias.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Mentorias ao vivo</h1>
        <p className="mt-2 text-sm text-[var(--dm-muted)]">
          Turmas fechadas com médicos reais para aprofundamento guiado.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[30px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-accent)]">
                  {item.product.specialty_name ?? "Mentoria médica"} · {item.product.mentor.name}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                  {item.product.summary}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                  {item.product.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--dm-muted)]">
                  <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                    {new Date(item.starts_at).toLocaleDateString("pt-BR")} até {new Date(item.ends_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                    {item.seats_left} vaga(s)
                  </span>
                  <span className="rounded-full border border-[var(--dm-border)] px-3 py-1">
                    R$ {(item.product.price_cents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-sm rounded-[24px] border border-[var(--dm-border)] bg-[var(--dm-bg)] p-5">
                <p className="font-medium">{item.product.mentor.title}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                  {item.product.mentor.bio}
                </p>
                {!item.viewer_enrolled ? (
                  <button
                    type="button"
                    onClick={() => void enroll(item.id)}
                    disabled={loadingId === item.id}
                    className="mt-5 w-full rounded-2xl bg-[var(--dm-accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {loadingId === item.id ? "Confirmando..." : "Entrar na turma"}
                  </button>
                ) : (
                  <div className="mt-5 space-y-3">
                    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Inscrição confirmada.
                    </p>
                    {item.meeting_url && (
                      <a
                        href={item.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl bg-[var(--dm-accent)] px-4 py-3 text-center text-sm font-medium text-white"
                      >
                        Entrar na sala ao vivo
                      </a>
                    )}
                    {item.access_instructions && (
                      <p className="text-sm leading-7 text-[var(--dm-muted)]">
                        {item.access_instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
