import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { apiUrl, apiJson } from "./api";

describe("apiUrl", () => {
  const orig = process.env.NEXT_PUBLIC_API_URL;
  const origWindow = global.window;

  afterEach(() => {
    if (orig !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = orig;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
    global.window = origWindow;
  });

  it("concatena base e caminho com barra", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000";
    expect(apiUrl("/api/health")).toBe("http://127.0.0.1:8000/api/health");
  });

  it("normaliza caminho sem barra inicial", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000";
    expect(apiUrl("api/health")).toBe("http://127.0.0.1:8000/api/health");
  });

  it("remove barra final da base", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000/";
    expect(apiUrl("/x")).toBe("http://127.0.0.1:8000/x");
  });

  it("usa mesma origem em produção quando a env não está definida", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    global.window = {
      location: {
        hostname: "doctor-mind.vercel.app",
      },
    } as Window & typeof globalThis;
    expect(apiUrl("/api/health")).toBe("/api/health");
  });
});

describe("apiJson", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("faz GET e retorna JSON", async () => {
    const data = await apiJson<{ ok: boolean }>("/api/health");
    expect(data.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("lança em resposta não ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      text: async () => "erro",
    } as Response);
    await expect(apiJson("/x")).rejects.toThrow();
  });
});
