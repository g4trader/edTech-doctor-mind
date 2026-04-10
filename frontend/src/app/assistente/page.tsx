import { Chat } from "@/components/Chat";

export default function AssistantPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Assistente educacional</h1>
      <p className="mb-6 max-w-3xl text-sm leading-7 text-[var(--dm-muted)]">
        Use o chat para revisar conceitos, explicar erros em provas e organizar
        sua estratégia de estudo.
      </p>
      <Chat />
    </div>
  );
}
