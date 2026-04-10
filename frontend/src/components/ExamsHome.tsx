"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api";

type Specialty = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export function ExamsHome() {
  const { ready, user } = useAuth();
  const [items, setItems] = useState<Specialty[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<Specialty[]>("/api/exams/specialties");
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar provas.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready) return <p className="text-sm text-[var(--dm-muted)]">Carregando...</p>;
  if (!user) {
    return (
      <p className="text-sm text-[var(--dm-muted)]">
        Faça login para acessar os simulados.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Provas simuladas</h1>
        <p className="mt-2 text-sm text-[var(--dm-muted)]">
          Escolha a especialidade e avance para o diagnóstico de proficiência.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/provas/${item.slug}`}
            className="rounded-[28px] border border-[var(--dm-border)] bg-[var(--dm-surface)] p-6"
          >
            <h2 className="text-xl font-semibold">{item.name}</h2>
            {item.description && (
              <p className="mt-3 text-sm leading-7 text-[var(--dm-muted)]">
                {item.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
