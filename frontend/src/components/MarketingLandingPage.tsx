"use client";

import Image from "next/image";
import Link from "next/link";

const doctors = [
  {
    name: "Aristóteles",
    specialty: "Pediatria",
    initials: "AR",
    imageSrc: "/aristoteles.png",
    bio: "Responsável pela frente de Pediatria, com foco em raciocínio clínico seguro e formação progressiva.",
  },
  {
    name: "Lucas",
    specialty: "Clínica Médica",
    initials: "LU",
    bio: "Conduz Clínica Médica com ênfase em interpretação de casos, revisão estruturada e tomada de decisão.",
  },
  {
    name: "Guilherme",
    specialty: "Cirurgia",
    initials: "GU",
    imageSrc: "/gui.peterson.jpeg",
    bio: "Lidera Cirurgia com abordagem objetiva, aplicada à prática e conectada às lacunas mais frequentes de prova.",
  },
  {
    name: "Em definição",
    specialty: "Ginecologia e Obstetrícia",
    initials: "GO",
    bio: "Card reservado para a médica obstetra que completará a curadoria inicial da plataforma.",
  },
];

const painPoints = [
  "Você investe horas, mas continua sem saber o que revisar primeiro.",
  "Cada prova mostra erros, mas não entrega uma rota clara de correção.",
  "Conteúdo, prova, chat e mentoria ficam espalhados em ferramentas diferentes.",
];

const solutionCards = [
  {
    title: "Diagnóstico por desempenho real",
    body: "O agente lê provas, proficiência, meta e disponibilidade semanal antes de sugerir qualquer passo.",
  },
  {
    title: "Plano de estudo em minutos",
    body: "A rotina sai organizada com prioridade, profundidade e sequência de revisão para a sua meta.",
  },
  {
    title: "Correção contínua da rota",
    body: "Cada novo resultado reorganiza o plano e mostra o próximo conteúdo que merece atenção.",
  },
];

const steps = [
  {
    step: "01",
    title: "Defina a meta",
    body: "Escolha a especialidade foco e o objetivo do momento.",
  },
  {
    step: "02",
    title: "Faça o diagnóstico",
    body: "Use provas e testes para mostrar onde estão as lacunas que mais pesam.",
  },
  {
    step: "03",
    title: "Siga o plano",
    body: "Receba a sequência de estudo e ajuste a rota conforme evolui.",
  },
];

const benefits = [
  "Saiba o que estudar hoje sem gastar energia decidindo sozinho.",
  "Concentre revisão nos temas que mais impactam sua evolução.",
  "Use provas para corrigir a rota, não apenas para medir nota.",
  "Tenha conteúdo, chat e plano dentro do mesmo fluxo.",
  "Estude com suporte de médicos reais por especialidade.",
  "Entre em mentorias fechadas quando precisar de aprofundamento.",
];

const testimonials = [
  {
    quote:
      "Parei de revisar por impulso. O plano mostrou exatamente o que atacar primeiro.",
    name: "Mariana R.",
    role: "R2 de Clínica Médica",
  },
  {
    quote:
      "O ganho real foi centralizar prova, conteúdo e correção de rota em um fluxo único.",
    name: "Lucas P.",
    role: "Médico generalista",
  },
  {
    quote:
      "A mentoria fechada aprofundou justamente os pontos em que eu estava falhando.",
    name: "Ana C.",
    role: "Preparação para prova de título",
  },
];

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-[family:var(--font-display)] text-3xl font-semibold tracking-tight text-white md:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">{body}</p>
      ) : null}
    </div>
  );
}

function PrimaryCta({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <Link
      href="/login"
      className={`${fullWidth ? "w-full sm:w-auto" : ""} inline-flex items-center justify-center rounded-full bg-cyan-300 px-7 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-200`}
    >
      Começar agora
    </Link>
  );
}

export function MarketingLandingPage() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 md:px-8 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:pb-24 lg:pt-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Agente de IA para educação médica
            </div>
            <h1 className="mt-6 font-[family:var(--font-display)] text-5xl font-semibold leading-[0.95] tracking-tight text-white md:text-6xl">
              Descubra exatamente o que estudar para evoluir na medicina.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Um agente de IA analisa seu desempenho, encontra suas lacunas e monta
              um plano de estudo em minutos.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-slate-200">
              <span className="font-semibold text-cyan-200">Diferencial concreto:</span>{" "}
              provas, diagnóstico, conteúdo, chat e mentoria funcionam no mesmo fluxo.
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <PrimaryCta />
              <Link
                href="#video"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Ver demonstração
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { value: "4", label: "especialidades iniciais com curadoria médica" },
                { value: "1", label: "fluxo único para estudar, medir e ajustar a rota" },
                { value: "Minutos", label: "para gerar o plano inicial de estudo" },
              ].map((item) => (
                <div key={item.label} className="border-t border-white/10 pt-4">
                  <p className="text-2xl font-semibold tracking-tight text-white">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/70">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                Agente ativo
              </span>
            </div>
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                    O que o agente lê
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                    <p>Meta: consolidar Clínica Médica para prova.</p>
                    <p>Disponibilidade: 6 horas por semana.</p>
                    <p>Lacunas: emergência, nefrologia e infectologia.</p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                    O que o agente entrega
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                    <p>Prioridade de estudo baseada em peso e domínio.</p>
                    <p>Plano semanal com revisão, conteúdo e questões.</p>
                    <p>Correção da rota após cada novo simulado.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Diagnóstico por tema", "Plano semanal pronto", "Explicação dos erros"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-[1.25rem] border border-white/10 bg-slate-950 px-4 py-4 text-sm leading-6 text-slate-200"
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="especialistas" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <SectionHeader
              eyebrow="Prova"
              title="A plataforma parte de uma base curada por médicos reais."
              body="A IA organiza o estudo, mas o conteúdo e a camada de aprofundamento são sustentados por especialistas da plataforma."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "4 frentes médicas já definidas para o lançamento.",
                "Mentorias fechadas para aprofundamento com turmas específicas.",
                "Conteúdo, prova e acompanhamento conectados no mesmo ecossistema.",
              ].map((item) => (
                <div key={item} className="border-t border-white/10 pt-4 text-sm leading-7 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {doctors.map((doctor) => (
              <article
                key={`${doctor.specialty}-${doctor.name}`}
                className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"
              >
                <div className="relative h-72 overflow-hidden bg-slate-900">
                  {doctor.imageSrc ? (
                    <Image
                      src={doctor.imageSrc}
                      alt={`Foto de ${doctor.name}`}
                      fill
                      sizes="(max-width: 1280px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800 text-4xl font-semibold text-slate-200">
                      {doctor.initials}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/85">
                      {doctor.specialty}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {doctor.name}
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-7 text-slate-400">{doctor.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.74fr_1.26fr]">
            <SectionHeader
              eyebrow="Problema"
              title="O maior desperdício não é estudar pouco. É estudar sem direção."
              body="Quem estuda medicina costuma ter disciplina. O que falta, na maior parte do tempo, é clareza sobre prioridade, sequência e profundidade."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {painPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="agente-ia" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <SectionHeader
            eyebrow="Solução"
            title="O agente resolve a parte mais difícil: decidir o que merece sua atenção agora."
            body="Em vez de abrir um chat e improvisar perguntas, você entra em um sistema que usa dados do seu estudo para devolver uma rota objetiva."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {solutionCards.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-7"
              >
                <h3 className="text-2xl font-semibold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <PrimaryCta />
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <SectionHeader
            eyebrow="Como funciona"
            title="Três passos para sair do estudo solto e entrar em evolução mensurável."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <article
                key={item.step}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-7"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">
                  {item.step}
                </p>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="video" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.74fr_1.26fr] lg:items-end">
            <SectionHeader
              eyebrow="Demonstração"
              title="Veja em poucos minutos como o agente organiza sua evolução."
              body="O vídeo deve mostrar a dor do aluno, a leitura do agente e o ganho prático de estudar com direção."
            />
            <div className="flex justify-start lg:justify-end">
              <PrimaryCta fullWidth />
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <div className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-500/10" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white text-3xl text-slate-950">
                  ▶
                </div>
                <p className="mt-6 text-3xl font-semibold tracking-tight text-white">
                  Vídeo institucional do Doctor Mind
                </p>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                  Mostre aqui a plataforma em ação: diagnóstico, plano, provas e correção da rota.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.74fr_1.26fr]">
            <SectionHeader
              eyebrow="Benefícios"
              title="O ganho real está em clareza, foco e correção de rota."
              body="A plataforma foi desenhada para reduzir carga cognitiva e melhorar a qualidade das decisões de estudo."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {benefits.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <SectionHeader
              eyebrow="Assinatura"
              title="Assine a plataforma e tenha um agente de IA guiando seu estudo médico."
              body="A assinatura básica libera conteúdos, provas, testes de proficiência, chat educacional e plano de estudo. As mentorias entram como camada premium."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Biblioteca organizada por especialidade, tema e subtema.",
                "Provas e simulados conectados ao diagnóstico.",
                "Plano de estudo baseado no seu desempenho.",
                "Chat educacional integrado à rotina acadêmica.",
                "Mentorias ao vivo com médicos reais como oferta adicional.",
                "Dashboard de evolução para acompanhar seu progresso.",
              ].map((item) => (
                <div key={item} className="border-t border-white/10 pt-4 text-sm leading-7 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                  CTA final
                </p>
                <h2 className="mt-4 font-[family:var(--font-display)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Pare de decidir sozinho o que estudar e comece com um plano claro.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                  Se a sua meta é evoluir com mais precisão, o próximo passo é testar a plataforma e ver o agente organizando a sua jornada.
                </p>
              </div>
              <div className="space-y-4 lg:text-right">
                <div className="flex justify-start lg:justify-end">
                  <PrimaryCta fullWidth />
                </div>
                <Link
                  href="/mentorias"
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Ver mentorias premium
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className="border-t border-white/10 pt-5">
                <p className="text-lg leading-8 text-white/90">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-4 text-sm text-slate-400">
                  <span className="font-semibold text-white">{item.name}</span>
                  <span> · {item.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
