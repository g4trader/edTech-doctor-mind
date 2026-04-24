"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";

type Msg = { id: string; role: string; content: string; created_at: string };
type QuickAction = { label: string; prompt: string };

const STORAGE_KEY = "doctor-mind-session";

export function Chat({
  title,
  description,
  defaultSpecialty = "",
  quickActions = [],
  stickyComposer = true,
  emptyState,
}: {
  title?: string;
  description?: string;
  defaultSpecialty?: string;
  quickActions?: QuickAction[];
  stickyComposer?: boolean;
  emptyState?: ReactNode;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [specialty, setSpecialty] = useState<string>(defaultSpecialty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boot, setBoot] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  useEffect(() => {
    if (!defaultSpecialty) return;
    setSpecialty((current) => current || defaultSpecialty);
  }, [defaultSpecialty]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const sid = JSON.parse(saved) as string;
          const list = await apiJson<Msg[]>(
            `/api/chat/sessions/${sid}/messages`,
          );
          if (!cancelled) {
            setSessionId(sid);
            setMessages(list);
          }
        } else {
          const created = await apiJson<{ session: { id: string } }>(
            "/api/chat/sessions",
            { method: "POST" },
          );
          if (!cancelled) {
            sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(created.session.id),
            );
            setSessionId(created.session.id);
            setMessages([]);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Não foi possível iniciar o chat.",
          );
        }
      } finally {
        if (!cancelled) setBoot(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || !sessionId || loading) return;
    setLoading(true);
    setError(null);
    setInput("");
    const optimistic: Msg = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const slug = specialty.trim() || null;
      await apiJson<unknown>(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: text,
          specialty_slug: slug,
        }),
      });
      const list = await apiJson<Msg[]>(
        `/api/chat/sessions/${sessionId}/messages`,
      );
      setMessages(list);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setError(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setLoading(false);
    }
  }, [input, sessionId, loading, specialty]);

  if (boot) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--dm-muted)]">
        Conectando…
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${stickyComposer ? "min-h-[calc(100dvh-4rem)]" : "min-h-[720px]"}`}>
      {(title || description) && (
        <div className="mb-4 rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-5">
          {title && <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>}
          {description && (
            <p className="mt-2 text-sm leading-7 text-[var(--dm-muted)]">{description}</p>
          )}
        </div>
      )}

      <p className="mb-4 text-sm leading-relaxed text-[var(--dm-muted)]">
        Use o agente para interpretar desempenho, revisar condutas, simular prova oral
        e reorganizar a sua sequência de estudo. Confirme sempre com protocolos locais
        e bulas.
      </p>

      <label className="mb-3 block text-xs font-medium text-[var(--dm-muted)]">
        Foco por especialidade (opcional, melhora o RAG)
        <input
          className="mt-1 w-full rounded-xl border border-[var(--dm-border)] bg-[var(--dm-surface)] px-3 py-2.5 text-sm text-[var(--dm-fg)] outline-none ring-[var(--dm-accent)] placeholder:text-[var(--dm-muted)] focus:ring-2"
          placeholder="ex.: clinica-medica, neurologia"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
        />
      </label>

      {quickActions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={loading || !sessionId}
              onClick={() => void send(action.prompt)}
              className="rounded-full border border-[var(--dm-border)] bg-[var(--dm-surface)] px-4 py-2 text-sm font-medium text-[var(--dm-fg)] transition hover:border-[var(--dm-accent)] hover:text-[var(--dm-accent)] disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className={`flex-1 space-y-3 overflow-y-auto ${stickyComposer ? "pb-28" : "pb-6"}`}>
        {messages.length === 0 && (
          emptyState ?? (
            <div className="rounded-2xl border border-dashed border-[var(--dm-border)] bg-[var(--dm-surface)] px-4 py-8 text-center text-sm text-[var(--dm-muted)]">
              Ex.: “Analise minhas áreas mais fracas e monte a próxima semana de estudo.”
            </div>
          )
        )}
        {messages.map((m) => (
          <div
            key={m.id + m.created_at}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--dm-accent)] text-white"
                  : "bg-[var(--dm-surface)] text-[var(--dm-fg)] border border-[var(--dm-border)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div
        className={
          stickyComposer
            ? "fixed bottom-0 left-0 right-0 border-t border-[var(--dm-border)] bg-[var(--dm-bg)]/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0"
            : "border-t border-[var(--dm-border)] pt-4"
        }
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <textarea
            rows={1}
            className="min-h-[48px] flex-1 resize-none rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-surface)] px-4 py-3 text-base text-[var(--dm-fg)] outline-none ring-[var(--dm-accent)] placeholder:text-[var(--dm-muted)] focus:ring-2 md:text-sm"
            placeholder="Digite sua pergunta…"
            value={input}
            disabled={loading || !sessionId}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !sessionId || !input.trim()}
            className="shrink-0 rounded-2xl bg-[var(--dm-accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
