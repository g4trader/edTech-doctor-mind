"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chat } from "@/components/Chat";
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
  description: string | null;
  topic_count?: number;
  content_count?: number;
  exam_count?: number;
};

type SpecialtyDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contents: {
    id: string;
    title: string;
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

type WeakTopic = {
  specialtySlug: string;
  specialtyName: string;
  topicTitle: string;
  accuracy: number;
  questionCount: number;
  correctAnswers: number;
};

const gapWeight: Record<string, number> = {
  alto: 3,
  médio: 2,
  baixo: 1,
};

function collectWeakTopics(
  proficiency: DashboardData["proficiency"],
): WeakTopic[] {
  return proficiency
    .flatMap((specialty) =>
      specialty.topics.map((topic) => ({
        specialtySlug: specialty.specialty_slug,
        specialtyName: specialty.specialty_name,
        topicTitle: topic.topic_title,
        accuracy: topic.accuracy,
        questionCount: topic.question_count,
        correctAnswers: topic.correct_answers,
      })),
    )
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.questionCount - a.questionCount;
    });
}

function pickDefaultSpecialty(
  dashboard: DashboardData,
  library: Specialty[],
): string {
  const fromProficiency = [...dashboard.proficiency].sort((a, b) => {
    const gapDelta = (gapWeight[b.gap_level] ?? 0) - (gapWeight[a.gap_level] ?? 0);
    if (gapDelta !== 0) return gapDelta;
    return a.average_score - b.average_score;
  })[0]?.specialty_slug;

  return fromProficiency ?? library[0]?.slug ?? "";
}

export function DashboardPage() {
  const { ready, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [focusDetail, setFocusDetail] = useState<SpecialtyDetail | null>(null);
  const [goal, setGoal] = useState(
    "Quero estruturar minha preparação para provas teóricas e práticas de residência, aprofundando minhas maiores lacunas."
  );
  const [weeklyHours, setWeeklyHours] = useState(6);
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
          setSpecialtySlug((current) => current || pickDefaultSpecialty(dashboard, library));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar a plataforma.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user || !specialtySlug) {
      setFocusDetail(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const detail = await apiJson<SpecialtyDetail>(
          `/api/library/specialties/${specialtySlug}`,
        );
        if (!cancelled) setFocusDetail(detail);
      } catch {
        if (!cancelled) setFocusDetail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, specialtySlug]);

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

  const weakTopics = useMemo(
    () => collectWeakTopics(data?.proficiency ?? []),
    [data?.proficiency],
  );

  const focusSpecialty = useMemo(
    () => specialties.find((item) => item.slug === specialtySlug) ?? null,
    [specialties, specialtySlug],
  );

  const quickActions = useMemo(() => {
    if (!data) return [];

    const topWeakness = weakTopics
      .slice(0, 3)
      .map(
        (item) =>
          `${item.specialtyName}: ${item.topicTitle} (${item.accuracy}% de acurácia em ${item.questionCount} questões)`,
      )
      .join("; ");

    const specialtyName = focusSpecialty?.name ?? "minha área de foco";
    const promptBase = topWeakness
      ? `Meu diagnóstico atual mostra os seguintes pontos fracos: ${topWeakness}.`
      : `Ainda não tenho tentativas registradas. Quero começar meu diagnóstico em ${specialtyName}.`;

    return [
      {
        label: "Analisar meu diagnóstico",
        prompt: `${promptBase} Atue como um preceptor de residência médica e resuma as lacunas mais críticas, por que elas importam na prova final e qual ordem de revisão devo seguir.`,
      },
      {
        label: "Montar trilha de 4 semanas",
        prompt: `${promptBase} Meu objetivo é: ${goal}. Tenho ${weeklyHours} horas por semana. Monte uma trilha de 4 semanas com conteúdos, revisões e provas, priorizando maior impacto para exames teóricos e práticos.`,
      },
      {
        label: "Simular prova oral",
        prompt: `Considere meu contexto atual de estudo em ${specialtyName}. Faça uma mini simulação oral com 5 perguntas progressivas, cobre raciocínio clínico e depois explique como eu devo ser avaliado.`,
      },
    ];
  }, [data, focusSpecialty?.name, goal, weeklyHours, weakTopics]);

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
          Workspace principal
        </p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight">
              Agente de proficiência, trilha e preparação para residência.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
              A plataforma agora gira em torno do agente: ele interpreta o seu
              desempenho, aponta os gaps mais perigosos para prova teórica e prática,
              recomenda o próximo diagnóstico e organiza a sequência de conteúdos e
              simulados.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Tentativas analisadas",
                value: data?.total_attempts ?? 0,
              },
              {
                label: "Média atual",
                value: data ? `${data.average_score}%` : "—",
              },
              {
                label: "Conteúdos concluídos",
                value: data ? `${data.completed_contents}/${data.total_contents}` : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && (
        <div className="rounded-3xl border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6 text-sm text-[var(--dm-muted)]">
          Carregando diagnóstico, biblioteca e plano atual...
        </div>
      )}

      {data && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                    Etapa 1
                  </p>
                  <p className="mt-2 font-semibold">Diagnóstico de proficiência</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                    Faça ou retome um simulado por especialidade para alimentar a análise.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                    Etapa 2
                  </p>
                  <p className="mt-2 font-semibold">Leitura dos gaps pelo agente</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                    O agente resume padrões de erro e transforma desempenho em foco real.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                    Etapa 3
                  </p>
                  <p className="mt-2 font-semibold">Trilha com conteúdo e prova</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                    Cada plano combina revisão, conteúdo e novo teste para corrigir a rota.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <Chat
                title="Converse com o agente de estudo"
                description="Use o chat para interpretar seu diagnóstico, pedir uma trilha, treinar prova oral e transformar lacunas em um plano executável."
                defaultSpecialty={specialtySlug}
                quickActions={quickActions}
                stickyComposer={false}
                emptyState={
                  <div className="rounded-2xl border border-dashed border-[var(--dm-border)] bg-[var(--dm-bg)] px-5 py-8 text-left text-sm text-[var(--dm-muted)]">
                    <p className="font-medium text-[var(--dm-fg)]">
                      O agente já pode começar com três tarefas:
                    </p>
                    <div className="mt-4 space-y-2 leading-7">
                      <p>1. Ler seu desempenho atual e destacar os temas mais sensíveis.</p>
                      <p>2. Priorizar o que revisar antes do próximo simulado.</p>
                      <p>3. Organizar uma trilha com conteúdos, revisões e novas provas.</p>
                    </div>
                  </div>
                }
              />
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                    Diagnóstico ativo
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Principais áreas de atenção
                  </h2>
                </div>
                <Link
                  href={specialtySlug ? `/provas/${specialtySlug}` : "/provas"}
                  className="rounded-full border border-[var(--dm-border)] px-4 py-2 text-sm font-medium"
                >
                  Fazer prova
                </Link>
              </div>

              {data.proficiency.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] p-5 text-sm leading-7 text-[var(--dm-muted)]">
                  Ainda não há diagnóstico suficiente. Comece por uma prova de
                  proficiência para que o agente identifique lacunas e reorganize a sua
                  preparação.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {weakTopics.slice(0, 4).map((topic) => (
                    <div
                      key={`${topic.specialtySlug}-${topic.topicTitle}`}
                      className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                        {topic.specialtyName}
                      </p>
                      <p className="mt-2 font-semibold">{topic.topicTitle}</p>
                      <p className="mt-1 text-sm text-[var(--dm-muted)]">
                        {topic.correctAnswers}/{topic.questionCount} corretas · {topic.accuracy}%
                        de acurácia
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                Trilha dirigida pelo agente
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Gerar novo plano
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
                  Objetivo da preparação
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
                  {planning ? "Gerando trilha..." : "Gerar trilha de aprendizado"}
                </button>
              </div>
            </section>

            <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                    Execução atual
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Próximos passos
                  </h2>
                </div>
                <Link
                  href="/conteudos"
                  className="rounded-full border border-[var(--dm-border)] px-4 py-2 text-sm font-medium"
                >
                  Biblioteca
                </Link>
              </div>

              {data.current_plan ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4">
                    <p className="font-semibold">{data.current_plan.title}</p>
                    <p className="mt-1 text-sm leading-7 text-[var(--dm-muted)]">
                      {data.current_plan.goal}
                    </p>
                  </div>
                  {data.current_plan.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                        Semana {item.week_index} · {item.day_label}
                      </p>
                      <p className="mt-2 font-semibold">{item.title}</p>
                      {item.rationale && (
                        <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                          {item.rationale}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-sm text-[var(--dm-muted)]">
                        <span>{item.estimated_minutes} min</span>
                        {item.content_id && (
                          <Link
                            href={`/conteudos/item/${item.content_id}`}
                            className="font-medium text-[var(--dm-accent)]"
                          >
                            Abrir conteúdo
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-5 text-sm leading-7 text-[var(--dm-muted)]">
                  Ainda não há trilha ativa. Gere um plano para transformar o diagnóstico
                  em sequência concreta de estudo.
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                Base recomendada
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Conteúdos e provas do foco atual
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                {focusDetail?.name ??
                  focusSpecialty?.name ??
                  "Selecione uma especialidade para o agente montar a trilha base."}
              </p>

              {focusDetail ? (
                <div className="mt-5 space-y-4">
                  <div className="space-y-3">
                    {focusDetail.contents
                      .filter((content) => !content.completed)
                      .slice(0, 3)
                      .map((content) => (
                        <Link
                          key={content.id}
                          href={`/conteudos/item/${content.id}`}
                          className="block rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
                        >
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--dm-muted)]">
                            {content.topic_title}
                          </p>
                          <p className="mt-2 font-semibold">{content.title}</p>
                          {content.summary && (
                            <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">
                              {content.summary}
                            </p>
                          )}
                        </Link>
                      ))}
                  </div>

                  <div className="space-y-3">
                    {focusDetail.exams.slice(0, 2).map((exam) => (
                      <Link
                        key={exam.id}
                        href={`/provas/${focusDetail.slug}/${exam.id}`}
                        className="block rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4"
                      >
                        <p className="font-semibold">{exam.title}</p>
                        <p className="mt-1 text-sm text-[var(--dm-muted)]">
                          {exam.question_count} questões · {exam.time_limit_minutes} min
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-5 text-sm leading-7 text-[var(--dm-muted)]">
                  O agente vai usar a especialidade selecionada para puxar conteúdos,
                  simulados e a próxima trilha recomendada.
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
