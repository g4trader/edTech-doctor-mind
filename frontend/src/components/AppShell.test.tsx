import type { ReactNode } from "react";
import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    ready: true,
    user: {
      full_name: "Dra. Camila Souza",
      email: "aluna@doctormind.local",
    },
    subscription: {
      plan: {
        name: "Assinatura Básica",
      },
    },
    logout: jest.fn(),
  }),
}));

describe("AppShell", () => {
  it("exibe marca e links de navegação", () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    );
    expect(screen.getByText("Doctor Mind")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Assistente")).toBeInTheDocument();
    expect(screen.getByText("Provas")).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
