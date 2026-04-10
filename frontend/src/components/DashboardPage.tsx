"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MarketingLandingPage } from "@/components/MarketingLandingPage";
import { apiJson } from "@/lib/api";

type DashboardData = {
  user_name: string;
  active_subscription_name: string | null;
  completed_contents: number;
  total_contents: number;
  total_attempts: number;
  average_score: number;
  proficiency: {
    specialty_slug: string;
    specialty_name: string;
    attempts: number;
    average_score: number;
    gap_level: string;
    topics: {
      topic_title: string;
      question_count: number;
      correct_answers: number;
      accuracy: number;
    }[];
  }[];
  current_plan: {
    id: string;
    title: string;
    goal: string;
    weekly_hours: number;
    status: string;
    specialty_name: string | null;
    created_at: string;
    items: {
      id: string;
      title: string;
      day_label: string;
      week_index: number;
      estimated_minutes: number;
      rationale: string | null;
      content_id: string | null;
      topic_title: string | null;
      status: string;
    }[];
  } | null;
  upcoming_mentorships: {
    cohort_id: string;
    title: string;
    starts_at: string;
    mentor_name: string;
  }[];
};

type Specialty = {
  id: string;
  name: string;
  slug: string;
};

export function DashboardPage() {
  const { ready, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [goal, setGoal] = useState(
    "Quero estruturar meu estudo com foco em prova e aprofundar minhas maiores lacunas."
  );
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [specialtySlug, setSpecialtySlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [dashboard, library] = await Promise.all([
          apiJson<DashboardData>("/api/dashboard"),
          apiJson<Specialty[]>("/api/library"),
        ]);

        if (!cancelled) {
          setData(dashboard);
          setSpecialties(library);
          setSpecialtySlug((current) => current || library[0]?.slug || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const generatePlan = async () => {
    setPlanning(true);
    setError(null);
    try {
      const plan = await apiJson<DashboardData["current_plan"]>("/api/study-plan/generate", {
        method: "POST",
        body: JSON.stringify({
          specialty_slug: specialtySlug || null,
          weekly_hours: weeklyHours,
          goal,
        }),
      });
      setData((current) => (current ? { ...current, current_plan: plan } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar plano.");
    } finally {
      setPlanning(false);
    }
  };

  if (!user) {
    return <MarketingLandingPage />;
  }

  if (!ready) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm text-[var(--dm-muted)]">
        Carregando plataforma...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dm-accent)]">
          Dashboard Acadêmico
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Olá, {user.full_name.split(" ")[0]}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--dm-muted)]">
              Centralize estudo, avaliação e mentoria a partir do seu desempenho.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-sm text-[var(--dm-muted)]">
            Plano ativo:{" "}
            <strong className="text-[var(--dm-fg)]">
              {data?.active_subscription_name ?? "Sem assinatura"}
            </strong>
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && (
        <div className="rounded-3xl border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6 text-sm text-[var(--dm-muted)]">
          Carregando métricas, biblioteca e plano atual...
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {[
              {
                label: "Conteúdos concluídos",
                value: `${data.completed_contents}/${data.total_contents}`,
              },
              {
                label: "Tentativas registradas",
                value: `${data.total_attempts}`,
              },
              {
                label: "Média atual",
                value: `${data.average_score}%`,
              },
              {
                label: "Mentorias próximas",
                value: `${data.upcoming_mentorships.length}`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Gaps de aprendizagem</h2>
                <Link href="/provas" className="text-sm font-medium text-[var(--dm-accent)]">
                  Abrir provas
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {data.proficiency.length === 0 && (
                  <p className="text-sm text-[var(--dm-muted)]">
                    Ainda não há tentativas suficientes. Faça um simulado para começar o
                    diagnóstico.
                  </p>
                )}
                {data.proficiency.map((item) => (
                  <article
                    key={item.specialty_slug}
                    className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{item.specialty_name}</h3>
                        <p className="text-sm text-[var(--dm-muted)]">
                          {item.attempts} tentativa(s) · média {item.average_score}% · gap{" "}
                          {item.gap_level}
                        </p>
                      </div>
                      <Link
                        href={`/conteudos/${item.specialty_slug}`}
                        className="rounded-full border border-[var(--dm-border)] px-4 py-2 text-sm"
                      >
                        Ver trilha
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {item.topics.slice(0, 4).map((topic) => (
                        <div
                          key={topic.topic_title}
                          className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-surface)] px-4 py-4"
                        >
                          <p className="font-medium">{topic.topic_title}</p>
                          <p className="mt-1 text-sm text-[var(--dm-muted)]">
                            {topic.correct_answers}/{topic.question_count} corretas ·{" "}
                            {topic.accuracy}% de acurácia
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Gerar plano personalizado
                </h2>
                <div className="mt-5 space-y-4">
                  <label className="block text-sm text-[var(--dm-muted)]">
                    Especialidade foco
                    <select
                      value={specialtySlug}
                      onChange={(event) => setSpecialtySlug(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-[var(--dm-fg)] outline-none focus:ring-2 focus:ring-[var(--dm-accent)]"
                    >
                      <option value="">Plano multidisciplinar</option>
                      {specialties.map((specialty) => (
                        <option key={specialty.id} value={specialty.slug}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-[var(--dm-muted)]">
                    Horas por semana
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={weeklyHours}
                      onChange={(event) => setWeeklyHours(Number(event.target.value))}
                      className="mt-1 w-full rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-[var(--dm-fg)] outline-none focus:ring-2 focus:ring-[var(--dm-accent)]"
                    />
                  </label>

                  <label className="block text-sm text-[var(--dm-muted)]">
                    Objetivo
                    <textarea
                      rows={4}
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-[var(--dm-fg)] outline-none focus:ring-2 focus:ring-[var(--dm-accent)]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void generatePlan()}
                    disabled={planning}
                    className="w-full rounded-2xl bg-[var(--dm-accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {planning ? "Gerando plano..." : "Gerar roteiro de capacitação"}
                  </button>
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
                <h2 className="text-2xl font-semibold tracking-tight">Mentorias próximas</h2>
                <div className="mt-5 space-y-3">
                  {data.upcoming_mentorships.length === 0 && (
                    <p className="text-sm text-[var(--dm-muted)]">
                      Nenhuma turma confirmada no momento.
                    </p>
                  )}
                  {data.upcoming_mentorships.map((item) => (
                    <div
                      key={item.cohort_id}
                      className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--dm-muted)]">
                        {new Date(item.starts_at).toLocaleDateString("pt-BR")} ·{" "}
                        {item.mentor_name}
                      </p>
                    </div>
                  ))}
                  <Link
                    href="/mentorias"
                    className="inline-flex rounded-full border border-[var(--dm-border)] px-4 py-2 text-sm font-medium"
                  >
                    Explorar mentorias
                  </Link>
                </div>
              </section>
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Plano atual</h2>
                <p className="mt-1 text-sm text-[var(--dm-muted)]">
                  O roteiro é reorganizado conforme suas provas e seu objetivo.
                </p>
              </div>
              <Link
                href="/conteudos"
                className="rounded-full border border-[var(--dm-border)] px-4 py-2 text-sm font-medium"
              >
                Abrir biblioteca
              </Link>
            </div>
            {!data.current_plan && (
              <p className="mt-4 text-sm text-[var(--dm-muted)]">
                Gere um plano para transformar seus gaps em sequência prática de estudo.
              </p>
            )}
            {data.current_plan && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4">
                  <p className="text-lg font-semibold">{data.current_plan.title}</p>
                  <p className="mt-1 text-sm text-[var(--dm-muted)]">
                    {data.current_plan.goal}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.current_plan.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                        Semana {item.week_index} · {item.day_label}
                      </p>
                      <p className="mt-2 font-medium">{item.title}</p>
                      <p className="mt-2 text-sm text-[var(--dm-muted)]">{item.rationale}</p>
                      <div className="mt-4 flex items-center justify-between text-sm text-[var(--dm-muted)]">
                        <span>{item.estimated_minutes} min</span>
                        {item.content_id && (
                          <Link
                            href={`/conteudos/item/${item.content_id}`}
                            className="font-medium text-[var(--dm-accent)]"
                          >
                            Abrir
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
