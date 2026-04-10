"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/conteudos", label: "Conteúdos" },
  { href: "/provas", label: "Provas" },
  { href: "/mentorias", label: "Mentorias" },
  { href: "/assistente", label: "Assistente" },
];

const marketingItems = [
  { href: "#agente-ia", label: "Agente IA" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#especialistas", label: "Especialistas" },
  { href: "#planos", label: "Assinatura" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, user, subscription, logout } = useAuth();
  const isMarketingHome = !user && pathname === "/";
  const navItems = isMarketingHome ? marketingItems : items;
  const shellClass = isMarketingHome
    ? "min-h-dvh bg-[#050814] text-white"
    : "min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.10),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.02),_rgba(255,255,255,0))] text-[var(--dm-fg)]";
  const headerClass = isMarketingHome
    ? "sticky top-0 z-20 border-b border-white/10 bg-[#050814]/78 backdrop-blur-xl"
    : "sticky top-0 z-20 border-b border-[var(--dm-border)] bg-[var(--dm-bg)]/88 backdrop-blur-xl";
  const brandBadgeClass = isMarketingHome
    ? "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-semibold text-slate-950"
    : "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--dm-accent)] text-sm font-semibold text-white";
  const planBadgeClass = isMarketingHome
    ? "hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-300 md:inline-flex"
    : "hidden rounded-full border border-[var(--dm-border)] bg-[var(--dm-surface)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--dm-muted)] md:inline-flex";
  const secondaryButtonClass = isMarketingHome
    ? "rounded-full border border-white/12 bg-white/5 px-4 py-2 font-medium text-white"
    : "rounded-full border border-[var(--dm-border)] bg-[var(--dm-surface)] px-4 py-2 font-medium text-[var(--dm-fg)]";
  const primaryButtonClass = isMarketingHome
    ? "rounded-full bg-cyan-300 px-4 py-2 font-medium text-slate-950"
    : "rounded-full bg-[var(--dm-accent)] px-4 py-2 font-medium text-white";

  return (
    <div className={shellClass}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className={brandBadgeClass}>
                DM
              </span>
              <span className="text-lg font-semibold tracking-tight">Doctor Mind</span>
            </Link>
            {subscription && (
              <span className={planBadgeClass}>
                {subscription.plan.name}
              </span>
            )}
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {navItems.map((item) => {
              const active =
                item.href.startsWith("#")
                  ? false
                  : item.href === "/"
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);
              const navClass = isMarketingHome
                ? active
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
                : active
                ? "bg-[var(--dm-accent)] text-white"
                : "text-[var(--dm-muted)] hover:bg-[var(--dm-surface)] hover:text-[var(--dm-fg)]";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 transition ${navClass}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            {ready && user ? (
              <>
                <div className="text-right">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-xs text-[var(--dm-muted)]">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-[var(--dm-border)] px-4 py-2"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                {isMarketingHome && (
                  <Link
                    href="/login"
                    className={secondaryButtonClass}
                  >
                    Ver demonstração
                  </Link>
                )}
                <Link
                  href="/login"
                  className={primaryButtonClass}
                >
                  Começar agora
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={
          isMarketingHome
            ? "w-full pb-0 pt-0"
            : "mx-auto w-full max-w-7xl px-4 pb-10 pt-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
