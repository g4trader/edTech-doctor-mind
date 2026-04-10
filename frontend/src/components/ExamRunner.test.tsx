import type { ReactNode } from "react";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { apiJson } from "@/lib/api";
import { ExamRunner } from "./ExamRunner";

jest.mock("@/lib/api", () => ({
  __esModule: true,
  apiUrl: (p: string) => `http://test${p}`,
  apiJson: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockApiJson = jest.mocked(apiJson);

const exam = {
  id: "e1",
  title: "Prova teste",
  description: null,
  time_limit_minutes: 30,
  questions: [
    {
      id: "q1",
      prompt: "Pergunta um?",
      options: ["A", "B", "C"],
      order_index: 0,
    },
  ],
};

describe("ExamRunner", () => {
  beforeEach(() => {
    mockApiJson.mockReset();
  });

  it("envia respostas e mostra resultado", async () => {
    mockApiJson.mockResolvedValueOnce({
      score: 100,
      total: 1,
      items: [
        {
          question_id: "q1",
          correct: true,
          correct_index: 1,
          explanation: "Comentário",
        },
      ],
    });

    render(<ExamRunner slug="clinica-medica" exam={exam} />);

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]);

    fireEvent.click(screen.getByRole("button", { name: /ver resultado/i }));

    expect(mockApiJson).toHaveBeenCalledWith(
      "/api/exams/e1/submit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ answers: [1] }),
      }),
    );

    expect(await screen.findByText(/100/)).toBeInTheDocument();
    expect(screen.getByText("Comentário")).toBeInTheDocument();
  });
});
