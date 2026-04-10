from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.domain import RagChunk
from app.services.ollama_client import OllamaError, ollama_embed


async def retrieve_context(
    session: AsyncSession,
    query: str,
    specialty_slug: str | None,
) -> tuple[str, list[dict]]:
    """
    Retorna texto de contexto para o prompt e metadados das fontes citadas.
    """
    try:
        q_emb = await ollama_embed(query)
    except OllamaError:
        return "", []

    dist = RagChunk.embedding.cosine_distance(q_emb)
    stmt = (
        select(RagChunk, dist.label("dist"))
        .where(dist <= (1.0 - settings.rag_min_similarity))
        .order_by(dist)
        .limit(settings.rag_top_k)
    )
    if specialty_slug:
        stmt = stmt.where(
            or_(
                RagChunk.specialty_slug.is_(None),
                RagChunk.specialty_slug == specialty_slug,
            )
        )

    result = await session.execute(stmt)
    rows = result.all()

    sources: list[dict] = []
    parts: list[str] = []
    for i, (chunk, d) in enumerate(rows, start=1):
        sim = max(0.0, min(1.0, 1.0 - float(d)))
        parts.append(f"[Fonte {i}: {chunk.title}]\n{chunk.content}")
        sources.append(
            {
                "id": str(chunk.id),
                "title": chunk.title,
                "source": chunk.source,
                "similarity": round(sim, 4),
            }
        )

    return "\n\n---\n\n".join(parts), sources


async def seed_rag_if_empty(session: AsyncSession) -> None:
    from sqlalchemy import func

    n = await session.scalar(select(func.count()).select_from(RagChunk))
    if n and n > 0:
        return

    samples = [
        {
            "title": "Hipertensão arterial — abordagem inicial",
            "content": (
                "Na suspeita de hipertensão arterial sistêmica em adultos jovens, "
                "recomenda-se medir PA em consultas repetidas ou MAPA/MRA antes de "
                "iniciar tratamento farmacológico definitivo, exceto em hipertensão "
                "grau 3 ou com lesão de órgão-alvo. IECA ou BRA são opções de primeira "
                "linha em muitos perfis; considerar contraindicações e gravidez."
            ),
            "source": "Material educacional interno (exemplo)",
            "specialty_slug": "clinica-medica",
        },
        {
            "title": "Prescrição — segurança e documentação",
            "content": (
                "Toda prescrição deve conter identificação do paciente, data, "
                "medicamento (nome, forma, concentração), posologia, duração e "
                "assinatura. Verificar interações, alergias, função renal/hepática e "
                "ajustes por idade. Em antibióticos, priorizar critérios de "
                "racionalidade e duração adequada ao quadro."
            ),
            "source": "Material educacional interno (exemplo)",
            "specialty_slug": None,
        },
        {
            "title": "Cefaleia — sinais de alarme",
            "content": (
                "Investigar urgentemente se cefaleia súbita em trovão, déficits "
                "neurológicos focais, febre com rigidez de nuca, alteração de "
                "consciência ou início após 50 anos com padrão novo. TC/RM conforme "
                "suspeita clínica."
            ),
            "source": "Material educacional interno (exemplo)",
            "specialty_slug": "neurologia",
        },
    ]

    for s in samples:
        try:
            emb = await ollama_embed(s["title"] + "\n\n" + s["content"])
        except OllamaError:
            continue
        session.add(
            RagChunk(
                title=s["title"],
                content=s["content"],
                source=s["source"],
                specialty_slug=s["specialty_slug"],
                embedding=emb,
            )
        )
    await session.commit()
