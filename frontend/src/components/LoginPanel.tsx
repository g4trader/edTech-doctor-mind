"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function LoginPanel() {
  const router = useRouter();
  const { ready, user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("aluna@doctormind.local");
  const [password, setPassword] = useState("demo12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && user) {
    return (
      <div className="rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6">
        <p className="text-sm text-[var(--dm-muted)]">
          Você já está autenticada como <strong>{user.full_name}</strong>.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-full bg-[var(--dm-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Ir para o dashboard
        </Link>
      </div>
    );
  }

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ full_name: fullName, email, password });
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-8 shadow-[0_20px_70px_-45px_rgba(13,148,136,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dm-accent)]">
          Doctor Mind
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight">
          Plataforma de educação médica com conteúdo, proficiência e mentorias.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--dm-muted)]">
          Entre com sua conta para acessar biblioteca curada, simulados, plano
          de estudo e salas ao vivo em turmas fechadas.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            "Conteúdos organizados por especialidade",
            "Diagnóstico de gaps e plano personalizado",
            "Mentorias ao vivo com médicos reais",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-4 text-sm text-[var(--dm-muted)]"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-8">
        <div className="inline-flex rounded-full border border-[var(--dm-border)] bg-[var(--dm-bg)] p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 ${mode === "login" ? "bg-[var(--dm-accent)] text-white" : "text-[var(--dm-muted)]"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-4 py-2 ${mode === "register" ? "bg-[var(--dm-accent)] text-white" : "text-[var(--dm-muted)]"}`}
          >
            Criar conta
          </button>
        </div>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-4">
            {mode === "register" && (
              <label className="block text-sm text-[var(--dm-muted)]">
                Nome completo
                <input
                  name="full_name"
                  autoComplete="name"
                  className="mt-1 w-full rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-[var(--dm-fg)] outline-none focus:ring-2 focus:ring-[var(--dm-accent)]"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            )}

            <label className="block text-sm text-[var(--dm-muted)]">
              E-mail
              <input
                name="email"
                autoComplete="email"
                className="mt-1 w-full rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-[var(--dm-fg)] outline-none focus:ring-2 focus:ring-[var(--dm-accent)]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block text-sm text-[var(--dm-muted)]">
              Senha
              <input
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="mt-1 w-full rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-bg)] px-4 py-3 text-[var(--dm-fg)] outline-none focus:ring-2 focus:ring-[var(--dm-accent)]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[var(--dm-accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Processando..." : mode === "login" ? "Entrar na plataforma" : "Criar conta e começar"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-[var(--dm-border)] px-4 py-4 text-sm text-[var(--dm-muted)]">
          <p className="font-medium text-[var(--dm-fg)]">Acesso demo</p>
          <p className="mt-1">E-mail: `aluna@doctormind.local`</p>
          <p>Senha: `demo12345`</p>
        </div>
      </section>
    </div>
  );
}
