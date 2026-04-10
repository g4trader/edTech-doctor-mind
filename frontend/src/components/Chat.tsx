"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";

type Msg = { id: string; role: string; content: string; created_at: string };

const STORAGE_KEY = "doctor-mind-session";

export function Chat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [specialty, setSpecialty] = useState<string>("");
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

  const send = useCallback(async () => {
    const text = input.trim();
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
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <p className="mb-4 text-sm leading-relaxed text-[var(--dm-muted)]">
        Pergunte sobre condutas, prescrições e raciocínio clínico. O contexto da
        base é recuperado automaticamente; confirme sempre com protocolos locais
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

      <div className="flex-1 space-y-3 overflow-y-auto pb-28">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--dm-border)] bg-[var(--dm-surface)] px-4 py-8 text-center text-sm text-[var(--dm-muted)]">
            Ex.: “Como iniciar anti-hipertensivo em paciente jovem assintomático?”
          </div>
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

      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--dm-border)] bg-[var(--dm-bg)]/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
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
