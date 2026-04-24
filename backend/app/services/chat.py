from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain import ChatMessage, ChatSession
from app.services.llm_client import LLMError, chat_completion
from app.services.rag import retrieve_context

SYSTEM_PROMPT = """Você é o Doctor Mind, assistente educacional para médicos em formação.
Responda em português do Brasil, com linguagem clara e profissional.
Use o contexto fornecido quando relevante; se o contexto for insuficiente, baseie-se em conhecimento geral de medicina e indique limitações.

Avisos obrigatórios:
- Este conteúdo é de apoio ao estudo e à prática clínica reflexiva, não substitui protocolos institucionais, nem a decisão clínica do médico responsável.
- Para prescrições e condutas, confirme sempre doses, interações e contraindicações em bulas e diretrizes atualizadas.
- Em emergências, priorize protocolos locais e suporte avançado."""


def _fallback_reply(
    user_text: str,
    specialty_slug: str | None,
    context_text: str,
    sources: list[dict],
) -> str:
    specialty_label = specialty_slug.replace("-", " ") if specialty_slug else "sua área de foco"
    lines = [
        "Estou em modo de orientação estruturada porque o modelo generativo externo não está disponível agora.",
        f"Mesmo assim, consigo te ajudar a organizar o estudo em {specialty_label}.",
    ]

    if sources:
        lines.extend(
            [
                "",
                "Pontos-base recuperados para orientar a próxima ação:",
            ]
        )
        for source in sources[:3]:
            lines.append(f"- {source['title']}")
    elif context_text:
        lines.extend(
            [
                "",
                "Há contexto recuperado da base para esta pergunta. Use-o como revisão prioritária antes do próximo simulado.",
            ]
        )

    lines.extend(
        [
            "",
            "Próximo passo sugerido:",
            "- identifique o tema clínico principal da sua pergunta;",
            "- revise o conteúdo correspondente na biblioteca;",
            "- resolva um simulado dessa especialidade logo depois;",
            "- volte ao agente com o resultado para recalibrar a trilha.",
            "",
            f"Sua última mensagem foi: \"{user_text[:240]}\"",
            "Se quiser, reformule pedindo em um destes formatos:",
            "- \"Monte uma trilha de 2 semanas para este tema\"",
            "- \"Simule uma prova oral sobre este assunto\"",
            "- \"Explique meus erros e diga o que revisar primeiro\"",
        ]
    )

    return "\n".join(lines)


async def append_and_reply(
    session: AsyncSession,
    chat_session_id: UUID,
    user_text: str,
    specialty_slug: str | None,
) -> tuple[ChatMessage, list[dict]]:
    chat_session = await session.get(
        ChatSession,
        chat_session_id,
        options=[selectinload(ChatSession.messages)],
    )
    if not chat_session:
        raise ValueError("Sessão não encontrada")

    user_msg = ChatMessage(session_id=chat_session_id, role="user", content=user_text)
    session.add(user_msg)
    await session.flush()

    context_text, sources = await retrieve_context(session, user_text, specialty_slug)

    history_msgs = await session.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session_id)
        .order_by(ChatMessage.created_at)
    )
    prior = history_msgs.scalars().all()

    ollama_messages: list[dict[str, str]] = []
    for m in prior:
        if m.role not in ("user", "assistant"):
            continue
        ollama_messages.append({"role": m.role, "content": m.content})

    augmented_system = SYSTEM_PROMPT
    if context_text:
        augmented_system += (
            "\n\nContexto recuperado da base de conhecimento (use com critério):\n"
            + context_text
        )

    try:
        answer_text = await chat_completion(ollama_messages, system=augmented_system)
    except LLMError as e:
        del e
        answer_text = _fallback_reply(user_text, specialty_slug, context_text, sources)

    asst = ChatMessage(
        session_id=chat_session_id, role="assistant", content=answer_text
    )
    session.add(asst)
    if not chat_session.title and user_text.strip():
        chat_session.title = user_text.strip()[:120]
    await session.commit()
    await session.refresh(asst)
    return asst, sources
