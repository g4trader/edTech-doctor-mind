from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain import (
    CohortEnrollment,
    ContentItem,
    ContentProgress,
    Exam,
    ExamAttempt,
    ExamAttemptAnswer,
    Mentor,
    MentorshipCohort,
    MentorshipProduct,
    Question,
    QuestionTopicLink,
    Specialty,
    StudyPlan,
    StudyPlanItem,
    Subscription,
    SubscriptionPlan,
    Subtopic,
    Topic,
    User,
)
from app.services.auth import hash_password
from app.services.rag import seed_rag_if_empty


async def _ensure_specialty(
    session: AsyncSession, *, name: str, slug: str, description: str
) -> Specialty:
    specialty = await session.scalar(select(Specialty).where(Specialty.slug == slug))
    if specialty:
        return specialty
    specialty = Specialty(name=name, slug=slug, description=description)
    session.add(specialty)
    await session.flush()
    return specialty


async def _ensure_topic(
    session: AsyncSession,
    *,
    specialty_id,
    title: str,
    slug: str,
    description: str,
    order_index: int,
) -> Topic:
    topic = await session.scalar(select(Topic).where(Topic.slug == slug))
    if topic:
        return topic
    topic = Topic(
        specialty_id=specialty_id,
        title=title,
        slug=slug,
        description=description,
        order_index=order_index,
    )
    session.add(topic)
    await session.flush()
    return topic


async def _ensure_subtopic(
    session: AsyncSession,
    *,
    topic_id,
    title: str,
    slug: str,
    description: str,
    order_index: int,
) -> Subtopic:
    subtopic = await session.scalar(select(Subtopic).where(Subtopic.slug == slug))
    if subtopic:
        return subtopic
    subtopic = Subtopic(
        topic_id=topic_id,
        title=title,
        slug=slug,
        description=description,
        order_index=order_index,
    )
    session.add(subtopic)
    await session.flush()
    return subtopic


async def _ensure_content(
    session: AsyncSession,
    *,
    specialty_id,
    topic_id,
    subtopic_id,
    title: str,
    slug: str,
    summary: str,
    body: str,
    estimated_minutes: int,
) -> ContentItem:
    content = await session.scalar(select(ContentItem).where(ContentItem.slug == slug))
    if content:
        return content
    content = ContentItem(
        specialty_id=specialty_id,
        topic_id=topic_id,
        subtopic_id=subtopic_id,
        title=title,
        slug=slug,
        summary=summary,
        body=body,
        estimated_minutes=estimated_minutes,
        is_published=True,
    )
    session.add(content)
    await session.flush()
    return content


async def _ensure_exam(
    session: AsyncSession,
    *,
    specialty_id,
    title: str,
    description: str,
    time_limit_minutes: int,
) -> Exam:
    exam = await session.scalar(select(Exam).where(Exam.title == title))
    if exam:
        return exam
    exam = Exam(
        specialty_id=specialty_id,
        title=title,
        description=description,
        time_limit_minutes=time_limit_minutes,
    )
    session.add(exam)
    await session.flush()
    return exam


async def _ensure_question(
    session: AsyncSession,
    *,
    exam_id,
    order_index: int,
    prompt: str,
    options: list[str],
    correct_index: int,
    explanation: str,
) -> Question:
    question = await session.scalar(
        select(Question).where(
            Question.exam_id == exam_id,
            Question.order_index == order_index,
        )
    )
    if question:
        return question
    question = Question(
        exam_id=exam_id,
        prompt=prompt,
        options=options,
        correct_index=correct_index,
        explanation=explanation,
        order_index=order_index,
    )
    session.add(question)
    await session.flush()
    return question


async def _ensure_question_topic_link(
    session: AsyncSession, *, question_id, topic_id
) -> None:
    link = await session.scalar(
        select(QuestionTopicLink).where(
            QuestionTopicLink.question_id == question_id,
            QuestionTopicLink.topic_id == topic_id,
        )
    )
    if not link:
        session.add(QuestionTopicLink(question_id=question_id, topic_id=topic_id))
        await session.flush()


async def _ensure_plan(
    session: AsyncSession,
    *,
    code: str,
    name: str,
    description: str,
    price_cents: int,
) -> SubscriptionPlan:
    plan = await session.scalar(select(SubscriptionPlan).where(SubscriptionPlan.code == code))
    if plan:
        return plan
    plan = SubscriptionPlan(
        code=code,
        name=name,
        description=description,
        price_cents=price_cents,
        billing_cycle="monthly",
    )
    session.add(plan)
    await session.flush()
    return plan


async def _ensure_user(
    session: AsyncSession,
    *,
    full_name: str,
    email: str,
    password: str,
    is_admin: bool,
) -> User:
    stmt = (
        select(User)
        .options(selectinload(User.subscriptions))
        .where(User.email == email.lower())
    )
    user = await session.scalar(stmt)
    if user:
        return user
    user = User(
        full_name=full_name,
        email=email.lower(),
        password_hash=hash_password(password),
        is_admin=is_admin,
    )
    session.add(user)
    await session.flush()
    return user


async def _ensure_subscription(
    session: AsyncSession, *, user_id, plan_id
) -> Subscription:
    subscription = await session.scalar(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.plan_id == plan_id,
            Subscription.status == "active",
        )
    )
    if subscription:
        return subscription
    subscription = Subscription(
        user_id=user_id,
        plan_id=plan_id,
        status="active",
    )
    session.add(subscription)
    await session.flush()
    return subscription


async def _ensure_mentor(
    session: AsyncSession,
    *,
    name: str,
    slug: str,
    title: str,
    bio: str,
) -> Mentor:
    mentor = await session.scalar(select(Mentor).where(Mentor.slug == slug))
    if mentor:
        return mentor
    mentor = Mentor(name=name, slug=slug, title=title, bio=bio)
    session.add(mentor)
    await session.flush()
    return mentor


async def _ensure_product(
    session: AsyncSession,
    *,
    mentor_id,
    specialty_id,
    title: str,
    slug: str,
    summary: str,
    description: str,
    price_cents: int,
) -> MentorshipProduct:
    product = await session.scalar(
        select(MentorshipProduct).where(MentorshipProduct.slug == slug)
    )
    if product:
        return product
    product = MentorshipProduct(
        mentor_id=mentor_id,
        specialty_id=specialty_id,
        title=title,
        slug=slug,
        summary=summary,
        description=description,
        price_cents=price_cents,
    )
    session.add(product)
    await session.flush()
    return product


async def _ensure_cohort(
    session: AsyncSession,
    *,
    product_id,
    title: str,
    starts_at: datetime,
    ends_at: datetime,
    capacity: int,
    meeting_url: str,
    access_instructions: str,
) -> MentorshipCohort:
    cohort = await session.scalar(
        select(MentorshipCohort).where(MentorshipCohort.title == title)
    )
    if cohort:
        return cohort
    cohort = MentorshipCohort(
        product_id=product_id,
        title=title,
        starts_at=starts_at,
        ends_at=ends_at,
        capacity=capacity,
        status="open",
        meeting_url=meeting_url,
        access_instructions=access_instructions,
    )
    session.add(cohort)
    await session.flush()
    return cohort


async def seed_demo_content(session: AsyncSession) -> None:
    await seed_rag_if_empty(session)

    basic_plan = await _ensure_plan(
        session,
        code="basic",
        name="Assinatura Básica",
        description="Acesso completo ao núcleo educacional: conteúdos, provas, proficiência e assistente.",
        price_cents=19900,
    )

    admin = await _ensure_user(
        session,
        full_name="Admin Doctor Mind",
        email="admin@doctormind.local",
        password="admin12345",
        is_admin=True,
    )
    student = await _ensure_user(
        session,
        full_name="Dra. Camila Souza",
        email="aluna@doctormind.local",
        password="demo12345",
        is_admin=False,
    )
    await _ensure_subscription(session, user_id=admin.id, plan_id=basic_plan.id)
    await _ensure_subscription(session, user_id=student.id, plan_id=basic_plan.id)

    specialties = {
        "clinica-medica": await _ensure_specialty(
            session,
            name="Clínica Médica",
            slug="clinica-medica",
            description="Condutas em ambiente hospitalar e ambulatorial geral.",
        ),
        "cardiologia": await _ensure_specialty(
            session,
            name="Cardiologia",
            slug="cardiologia",
            description="Síndromes coronarianas, arritmias e insuficiência cardíaca.",
        ),
        "neurologia": await _ensure_specialty(
            session,
            name="Neurologia",
            slug="neurologia",
            description="AVC, cefaleia, epilepsia e doenças neurodegenerativas.",
        ),
        "pediatria": await _ensure_specialty(
            session,
            name="Pediatria",
            slug="pediatria",
            description="Crescimento, vacinação e emergências pediátricas.",
        ),
    }

    topic_defs = {
        "clinica-medica": [
            ("hipertensao", "Hipertensão", "Diagnóstico, estratificação e tratamento inicial."),
            ("risco-cardiovascular", "Risco Cardiovascular", "Prevenção primária, metas e seguimento."),
        ],
        "cardiologia": [
            ("sindrome-coronariana", "Síndrome Coronariana", "Abordagem inicial e reperfusão."),
            ("insuficiencia-cardiaca", "Insuficiência Cardíaca", "Congestão, perfil hemodinâmico e alta."),
        ],
        "neurologia": [
            ("avc", "AVC", "Janela terapêutica, escalas e imagem."),
            ("cefaleias", "Cefaleias", "Diferenciação e sinais de alarme."),
        ],
        "pediatria": [
            ("urgencias-pediatricas", "Urgências Pediátricas", "Abordagem inicial e estabilização."),
            ("crescimento-e-vacinacao", "Crescimento e Vacinação", "Calendário e marcos de desenvolvimento."),
        ],
    }
    topic_map: dict[str, Topic] = {}
    subtopic_map: dict[str, Subtopic] = {}
    for specialty_slug, topics in topic_defs.items():
        specialty = specialties[specialty_slug]
        for index, (slug_root, title, description) in enumerate(topics):
            topic = await _ensure_topic(
                session,
                specialty_id=specialty.id,
                title=title,
                slug=f"{specialty_slug}-{slug_root}",
                description=description,
                order_index=index,
            )
            topic_map[topic.slug] = topic
            subtopic = await _ensure_subtopic(
                session,
                topic_id=topic.id,
                title=f"Fundamentos de {title}",
                slug=f"{topic.slug}-fundamentos",
                description=f"Base conceitual para {title.lower()}.",
                order_index=0,
            )
            subtopic_map[subtopic.slug] = subtopic

    content_defs = [
        {
            "specialty": "clinica-medica",
            "topic": "clinica-medica-hipertensao",
            "title": "Manejo inicial da hipertensão ambulatorial",
            "slug": "hipertensao-ambulatorial-inicial",
            "summary": "Como confirmar diagnóstico, estratificar risco e definir intervenção inicial.",
            "body": "Objetivo: estruturar a primeira consulta de hipertensão.\n\n1. Confirmar a medida com técnica adequada e considerar MRPA/MAPA.\n2. Investigar lesão de órgão-alvo e fatores de risco.\n3. Reforçar mudança de estilo de vida com metas objetivas.\n4. Introduzir farmacoterapia conforme perfil, gravidade e comorbidades.\n5. Programar reavaliação curta com critérios de ajuste.",
            "estimated_minutes": 18,
        },
        {
            "specialty": "clinica-medica",
            "topic": "clinica-medica-risco-cardiovascular",
            "title": "Estratificação de risco e prevenção primária",
            "slug": "prevencao-primaria-risco-cardiovascular",
            "summary": "Priorização de metas lipídicas, pressão e intervenção comportamental.",
            "body": "Use risco global para organizar a conversa clínica.\n\n- Avalie fatores maiores e antecedentes.\n- Discuta estatina conforme risco e tolerância.\n- Vincule metas laboratoriais a condutas concretas.\n- Defina follow-up para adesão e segurança.",
            "estimated_minutes": 20,
        },
        {
            "specialty": "cardiologia",
            "topic": "cardiologia-sindrome-coronariana",
            "title": "Dor torácica com supra: o que não pode atrasar",
            "slug": "dor-toracica-com-supra-conduta",
            "summary": "Sequência prática para reconhecer IAM com supra e acionar reperfusão.",
            "body": "No cenário de dor torácica isquêmica com supra de ST, o tempo é prognóstico.\n\nChecklist: ECG precoce, antitrombóticos conforme protocolo, ativação da hemodinâmica ou trombólise conforme disponibilidade, monitorização e avaliação de complicações.",
            "estimated_minutes": 16,
        },
        {
            "specialty": "cardiologia",
            "topic": "cardiologia-insuficiencia-cardiaca",
            "title": "Insuficiência cardíaca descompensada no pronto atendimento",
            "slug": "insuficiencia-cardiaca-descompensada-pa",
            "summary": "Perfis clínicos, alívio de congestão e critérios de gravidade.",
            "body": "A avaliação combina perfusão, congestão e gatilhos.\n\nMapeie perfil hemodinâmico, investigue adesão, infecção, isquemia e arritmias, e organize a alta com plano terapêutico e seguimento precoce.",
            "estimated_minutes": 22,
        },
        {
            "specialty": "neurologia",
            "topic": "neurologia-avc",
            "title": "AVC agudo: janela terapêutica e decisão inicial",
            "slug": "avc-agudo-janela-terapeutica",
            "summary": "Fluxo inicial para suspeita de AVC isquêmico e critérios de imagem.",
            "body": "Priorize hora de início dos sintomas, avaliação neurológica rápida, glicemia e imagem.\n\nA decisão de trombólise/trombectomia depende de tempo, déficit, imagem e contraindicações. A equipe precisa trabalhar com protocolos claros e comunicação objetiva.",
            "estimated_minutes": 19,
        },
        {
            "specialty": "neurologia",
            "topic": "neurologia-cefaleias",
            "title": "Cefaleia no plantão: quando pensar em causa secundária",
            "slug": "cefaleia-sinais-de-alarme-plantao",
            "summary": "Como separar cefaleia primária de cenários com investigação urgente.",
            "body": "Foque nos sinais de alarme: cefaleia em trovão, febre, rigidez de nuca, déficit focal, imunossupressão, gestação/puerpério e padrão novo após os 50 anos.\n\nA história orienta a escolha de TC, angio-TC, RM e punção lombar.",
            "estimated_minutes": 17,
        },
        {
            "specialty": "pediatria",
            "topic": "pediatria-urgencias-pediatricas",
            "title": "Abordagem da criança febril no pronto atendimento",
            "slug": "crianca-febril-pronto-atendimento",
            "summary": "Estrutura de triagem, sinais de toxemia e conduta inicial.",
            "body": "A avaliação pediátrica exige impressão geral, hidratação, perfusão e comportamento.\n\nDefina gravidade cedo, use faixa etária como filtro de risco e valorize sinais de esforço respiratório, hipoperfusão, hipoatividade e contexto vacinal.",
            "estimated_minutes": 18,
        },
        {
            "specialty": "pediatria",
            "topic": "pediatria-crescimento-e-vacinacao",
            "title": "Vacinação e seguimento de puericultura",
            "slug": "vacinacao-e-puericultura",
            "summary": "Organização prática da consulta de seguimento e educação familiar.",
            "body": "Na puericultura, una desenvolvimento, crescimento, alimentação e prevenção.\n\nRevise calendário vacinal, marcos do neurodesenvolvimento, padrão de sono, vínculo familiar e sinais de alerta que exigem investigação complementar.",
            "estimated_minutes": 21,
        },
    ]

    content_map: dict[str, ContentItem] = {}
    for item in content_defs:
        topic = topic_map[item["topic"]]
        subtopic = subtopic_map[f"{item['topic']}-fundamentos"]
        content = await _ensure_content(
            session,
            specialty_id=specialties[item["specialty"]].id,
            topic_id=topic.id,
            subtopic_id=subtopic.id,
            title=item["title"],
            slug=item["slug"],
            summary=item["summary"],
            body=item["body"],
            estimated_minutes=item["estimated_minutes"],
        )
        content_map[content.slug] = content

    exam_blueprints = [
        {
            "specialty": "clinica-medica",
            "title": "Simulado — Hipertensão e risco cardiovascular",
            "description": "Questões objetivas com foco em diagnóstico e manejo inicial.",
            "time_limit_minutes": 45,
            "questions": [
                {
                    "topic": "clinica-medica-hipertensao",
                    "prompt": "Paciente 42 anos, assintomático, PA 150/92 mmHg em duas medidas. Próximo passo mais adequado:",
                    "options": [
                        "Iniciar IECA imediatamente em consultório",
                        "Repetir medidas em casa ou MAPA antes de rotular HAS",
                        "Internar para investigação",
                        "Solicitar cateterismo cardíaco",
                    ],
                    "correct_index": 1,
                    "explanation": "A confirmação com medidas fora do consultório evita diagnóstico precipitado em cenários não graves.",
                },
                {
                    "topic": "clinica-medica-risco-cardiovascular",
                    "prompt": "Sobre estatinas na prevenção primária, é correto afirmar:",
                    "options": [
                        "São contraindicadas se LDL < 190 mg/dL",
                        "A decisão considera risco global e tolerância",
                        "Substituem mudança de estilo de vida",
                        "Devem ser usadas apenas pós-IAM",
                    ],
                    "correct_index": 1,
                    "explanation": "Estratificação de risco e decisão compartilhada orientam a prevenção primária.",
                },
            ],
        },
        {
            "specialty": "cardiologia",
            "title": "Simulado — Dor torácica aguda",
            "description": "Avaliação inicial e condutas em serviço de emergência.",
            "time_limit_minutes": 30,
            "questions": [
                {
                    "topic": "cardiologia-sindrome-coronariana",
                    "prompt": "Homem 58 anos, dor precordial opressiva, sudorese e supra de ST em V1-V4. Conduta prioritária:",
                    "options": [
                        "Alta com anti-inflamatório",
                        "Ativar protocolo de IAM com supra e reperfusão urgente",
                        "Apenas observação por 24h",
                        "Tomografia de tórax de rotina",
                    ],
                    "correct_index": 1,
                    "explanation": "IAM com supra exige reperfusão emergencial e coordenação rápida da linha de cuidado.",
                },
                {
                    "topic": "cardiologia-insuficiencia-cardiaca",
                    "prompt": "Na insuficiência cardíaca aguda congesta, o objetivo imediato mais frequente é:",
                    "options": [
                        "Suspender toda terapêutica crônica",
                        "Aliviar congestão e identificar precipitantes",
                        "Dar alta precoce sem reavaliação",
                        "Evitar monitorização cardíaca",
                    ],
                    "correct_index": 1,
                    "explanation": "O manejo combina estabilização, controle de volume e investigação do fator desencadeante.",
                },
            ],
        },
        {
            "specialty": "neurologia",
            "title": "Simulado — AVC e cefaleias",
            "description": "Reconhecimento de urgências neurológicas e sinais de alarme.",
            "time_limit_minutes": 35,
            "questions": [
                {
                    "topic": "neurologia-avc",
                    "prompt": "Na suspeita de AVC isquêmico hiperagudo, o dado que mais impacta elegibilidade terapêutica é:",
                    "options": [
                        "Peso corporal isolado",
                        "Hora do último momento bem conhecido e imagem",
                        "Histórico de rinite alérgica",
                        "Número de consultas no último ano",
                    ],
                    "correct_index": 1,
                    "explanation": "A janela terapêutica depende de cronologia clínica e achados de imagem.",
                },
                {
                    "topic": "neurologia-cefaleias",
                    "prompt": "Qual cenário favorece investigação urgente de cefaleia secundária?",
                    "options": [
                        "Padrão habitual sem mudança",
                        "Cefaleia em trovão com déficit focal",
                        "Resposta prévia a analgésico simples",
                        "Fotofobia leve recorrente desde adolescência",
                    ],
                    "correct_index": 1,
                    "explanation": "Cefaleia súbita, intensa e com déficit focal exige avaliação imediata.",
                },
            ],
        },
        {
            "specialty": "pediatria",
            "title": "Simulado — Urgências e puericultura",
            "description": "Fluxos básicos de atendimento pediátrico e prevenção.",
            "time_limit_minutes": 35,
            "questions": [
                {
                    "topic": "pediatria-urgencias-pediatricas",
                    "prompt": "Na criança febril, qual achado aumenta a suspeita de gravidade?",
                    "options": [
                        "Brincar normalmente na sala",
                        "Perfusão ruim e hipoatividade",
                        "Aceitar líquidos espontaneamente",
                        "Febre isolada sem outros sintomas",
                    ],
                    "correct_index": 1,
                    "explanation": "Alteração de perfusão e comportamento são marcadores relevantes de toxemia.",
                },
                {
                    "topic": "pediatria-crescimento-e-vacinacao",
                    "prompt": "Na puericultura, além do peso, é essencial revisar:",
                    "options": [
                        "Somente o apetite da última semana",
                        "Vacinação e marcos do desenvolvimento",
                        "Apenas o tipo sanguíneo",
                        "A cor favorita da criança",
                    ],
                    "correct_index": 1,
                    "explanation": "A consulta de seguimento integra crescimento, neurodesenvolvimento e prevenção.",
                },
            ],
        },
    ]

    exam_map: dict[str, Exam] = {}
    for exam_def in exam_blueprints:
        specialty = specialties[exam_def["specialty"]]
        exam = await _ensure_exam(
            session,
            specialty_id=specialty.id,
            title=exam_def["title"],
            description=exam_def["description"],
            time_limit_minutes=exam_def["time_limit_minutes"],
        )
        exam_map[exam.title] = exam
        for index, question_def in enumerate(exam_def["questions"]):
            question = await _ensure_question(
                session,
                exam_id=exam.id,
                order_index=index,
                prompt=question_def["prompt"],
                options=question_def["options"],
                correct_index=question_def["correct_index"],
                explanation=question_def["explanation"],
            )
            await _ensure_question_topic_link(
                session,
                question_id=question.id,
                topic_id=topic_map[question_def["topic"]].id,
            )

    mentor_1 = await _ensure_mentor(
        session,
        name="Dr. Rafael Martins",
        slug="dr-rafael-martins",
        title="Cardiologista e preceptor de emergência",
        bio="Especialista em cardiologia clínica com atuação em dor torácica aguda e treinamento de residentes.",
    )
    mentor_2 = await _ensure_mentor(
        session,
        name="Dra. Juliana Prado",
        slug="dra-juliana-prado",
        title="Neurologista focada em AVC e raciocínio neurológico",
        bio="Preceptora hospitalar com foco em protocolos de AVC, cefaleia e estruturação de condutas.",
    )

    product_1 = await _ensure_product(
        session,
        mentor_id=mentor_1.id,
        specialty_id=specialties["cardiologia"].id,
        title="Mentoria fechada: dor torácica sem ruído",
        slug="mentoria-dor-toracica-sem-ruido",
        summary="Turma fechada para treinar raciocínio em dor torácica e síndromes coronarianas.",
        description="Quatro encontros ao vivo com discussão de casos, interpretação de ECG e revisão de protocolos de emergência.",
        price_cents=149900,
    )
    product_2 = await _ensure_product(
        session,
        mentor_id=mentor_2.id,
        specialty_id=specialties["neurologia"].id,
        title="Mentoria fechada: AVC do reconhecimento à decisão",
        slug="mentoria-avc-reconhecimento-decisao",
        summary="Treinamento prático para avaliação inicial, imagem e tomada de decisão em AVC.",
        description="Sessões ao vivo em turma restrita, com cenários clínicos e revisão de pitfalls frequentes.",
        price_cents=169900,
    )

    cohort_1 = await _ensure_cohort(
        session,
        product_id=product_1.id,
        title="Turma Abril 2026 — Dor torácica sem ruído",
        starts_at=datetime.now(UTC) + timedelta(days=10),
        ends_at=datetime.now(UTC) + timedelta(days=24),
        capacity=20,
        meeting_url="https://meet.doctormind.local/turma-dor-toracica",
        access_instructions="Link liberado apenas para alunos inscritos. A sala abre 15 minutos antes do início.",
    )
    await _ensure_cohort(
        session,
        product_id=product_2.id,
        title="Turma Maio 2026 — AVC do reconhecimento à decisão",
        starts_at=datetime.now(UTC) + timedelta(days=20),
        ends_at=datetime.now(UTC) + timedelta(days=35),
        capacity=18,
        meeting_url="https://meet.doctormind.local/turma-avc",
        access_instructions="A mentoria ocorre em encontros síncronos semanais com material de apoio liberado após cada sessão.",
    )

    existing_enrollment = await session.scalar(
        select(CohortEnrollment).where(
            CohortEnrollment.user_id == student.id,
            CohortEnrollment.cohort_id == cohort_1.id,
        )
    )
    if not existing_enrollment:
        session.add(
            CohortEnrollment(
                user_id=student.id,
                cohort_id=cohort_1.id,
                status="confirmed",
            )
        )

    for index, content in enumerate(
        [
            content_map["hipertensao-ambulatorial-inicial"],
            content_map["dor-toracica-com-supra-conduta"],
        ],
        start=1,
    ):
        progress = await session.scalar(
            select(ContentProgress).where(
                ContentProgress.user_id == student.id,
                ContentProgress.content_id == content.id,
            )
        )
        if not progress:
            session.add(
                ContentProgress(
                    user_id=student.id,
                    content_id=content.id,
                    completed=True,
                    minutes_spent=content.estimated_minutes + 5,
                    completed_at=datetime.now(UTC) - timedelta(days=index),
                    last_opened_at=datetime.now(UTC) - timedelta(days=index),
                )
            )

    sample_attempts = [
        (exam_map["Simulado — Hipertensão e risco cardiovascular"], [1, 0]),
        (exam_map["Simulado — Dor torácica aguda"], [1, 1]),
    ]
    for exam, answers in sample_attempts:
        existing_attempt = await session.scalar(
            select(ExamAttempt).where(
                ExamAttempt.user_id == student.id,
                ExamAttempt.exam_id == exam.id,
            )
        )
        if existing_attempt:
            continue

        questions = (
            await session.execute(
                select(Question)
                .where(Question.exam_id == exam.id)
                .order_by(Question.order_index.asc())
            )
        ).scalars().all()
        attempt = ExamAttempt(
            user_id=student.id,
            exam_id=exam.id,
            score=0.0,
            total_questions=len(questions),
            correct_answers=0,
        )
        session.add(attempt)
        await session.flush()

        correct_answers = 0
        for question, selected_index in zip(questions, answers, strict=True):
            is_correct = int(selected_index) == int(question.correct_index)
            if is_correct:
                correct_answers += 1
            session.add(
                ExamAttemptAnswer(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    selected_index=selected_index,
                    correct=is_correct,
                )
            )

        attempt.correct_answers = correct_answers
        attempt.score = round(
            (correct_answers / len(questions) * 100.0) if questions else 0.0,
            1,
        )

    active_plan = await session.scalar(
        select(StudyPlan)
        .where(StudyPlan.user_id == student.id, StudyPlan.status == "active")
        .order_by(StudyPlan.created_at.desc())
    )
    if not active_plan:
        plan = StudyPlan(
            user_id=student.id,
            specialty_id=specialties["clinica-medica"].id,
            title="Plano guiado de Clínica Médica",
            goal="Consolidar hipertensão e prevenção cardiovascular nas próximas duas semanas.",
            weekly_hours=5,
            status="active",
        )
        session.add(plan)
        await session.flush()

        plan_contents = [
            content_map["hipertensao-ambulatorial-inicial"],
            content_map["prevencao-primaria-risco-cardiovascular"],
            content_map["dor-toracica-com-supra-conduta"],
        ]
        weekdays = ["Segunda", "Quarta", "Sábado"]
        for index, content in enumerate(plan_contents, start=1):
            session.add(
                StudyPlanItem(
                    plan_id=plan.id,
                    topic_id=content.topic_id,
                    content_id=content.id,
                    title=content.title,
                    rationale="Sequência sugerida a partir do desempenho inicial e da necessidade de reforçar tomada de decisão.",
                    week_index=1,
                    day_label=weekdays[index - 1],
                    estimated_minutes=max(40, content.estimated_minutes),
                    status="pending",
                )
            )

    await session.commit()
