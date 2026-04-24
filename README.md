# Doctor Mind

Plataforma EdTech de medicina em formato de assinatura. O aluno acessa **conteúdo especializado**, **provas simuladas**, **diagnóstico de gaps**, **plano de estudo personalizado**, **chat educacional** e **mentorias ao vivo em turmas fechadas com médicos reais**.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React, Next.js 15 (App Router), Tailwind |
| Backend | Python 3.12+, FastAPI, SQLAlchemy async |
| SQL | PostgreSQL 16 com extensão **pgvector** |
| IA | **Ollama** (gratuito, local): modelo de chat + embeddings para RAG |

## Pré-requisitos

- Docker (para o banco) ou PostgreSQL com pgvector
- Python 3.12+
- Node.js 18+ (recomendado 20+)
- [Ollama](https://ollama.com) instalado e em execução

### Modelos Ollama (gratuitos, locais)

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

Os nomes podem ser ajustados em `backend/.env` (`OLLAMA_CHAT_MODEL`, `OLLAMA_EMBED_MODEL`).

## Como rodar

### 1. MVP completo com Docker

Na raiz do projeto:

```bash
docker compose up --build -d
```

Ou:

```bash
make docker-up
```

URLs locais:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- Docs da API: [http://localhost:8000/docs](http://localhost:8000/docs)

Para acompanhar logs:

```bash
make docker-logs
```

Para desligar:

```bash
make docker-down
```

### 2. Apenas banco de dados

Na raiz do projeto:

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # ajuste se necessário
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Documentação interativa: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Na primeira subida, o sistema cria tabelas, especialidades de exemplo, conteúdos, provas, usuários demo, mentorias e tenta popular o RAG (se o Ollama estiver disponível).

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Credenciais demo

Aluno:

```bash
E-mail: aluna@doctormind.local
Senha: demo12345
```

Administrador:

```bash
E-mail: admin@doctormind.local
Senha: admin12345
```

## Docker

- `db` usa PostgreSQL 16 com `pgvector`
- `backend` expõe a API FastAPI em `:8000`
- `frontend` sobe o Next.js em `:3000`
- o backend aponta para `host.docker.internal:11434` para encontrar o Ollama do host quando ele estiver rodando

## Deploy

Arquitetura alvo:

- `frontend/` na **Vercel**
- `backend/` no **Google Cloud Run**

### Frontend na Vercel

Crie um projeto Vercel com **Root Directory** = `frontend`.

Variável obrigatória:

```bash
NEXT_PUBLIC_API_URL=https://SEU-BACKEND-URL.run.app
```

Comportamento:

- em desenvolvimento local, sem env definida, o frontend usa `http://127.0.0.1:8000`
- fora do ambiente local, `NEXT_PUBLIC_API_URL` é obrigatória

### Backend no Google Cloud Run

O container do backend já está preparado para Cloud Run em `docker/backend.Dockerfile`, incluindo suporte à variável `PORT` exigida pela plataforma.

Variáveis recomendadas no serviço:

```bash
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME
CORS_ORIGINS=https://SEU-FRONTEND.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
CORS_ALLOW_CREDENTIALS=false

AUTO_INIT_DB=true
AUTO_SEED_DEMO_DATA=true

OLLAMA_BASE_URL=https://seu-ollama-ou-gateway.exemplo.com
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text
```

Observações:

- `DATABASE_URL` precisa apontar para PostgreSQL com extensão `pgvector`
- `AUTO_INIT_DB` e `AUTO_SEED_DEMO_DATA` podem ser desligados após a inicialização inicial
- se `OLLAMA_BASE_URL` não estiver acessível pela internet, a API sobe, mas o chat/RAG não funciona

Exemplo de fluxo com `gcloud`:

```bash
gcloud builds submit --tag gcr.io/SEU-PROJETO/doctor-mind-backend -f docker/backend.Dockerfile .
gcloud run deploy doctor-mind-backend \
  --image gcr.io/SEU-PROJETO/doctor-mind-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Ordem sugerida

1. Fazer deploy do backend no Cloud Run
2. Validar `https://SEU-BACKEND-URL.run.app/health`
3. Configurar `NEXT_PUBLIC_API_URL` no projeto da Vercel
4. Fazer deploy do frontend

## MVP atual

- Autenticação com sessão via token
- Assinatura básica ativa por seed
- Biblioteca por especialidade, tema e subtema
- Provas simuladas por especialidade
- Histórico de tentativas alimentando diagnóstico de proficiência
- Geração de plano de estudo personalizado
- Chat educacional autenticado
- Mentorias ao vivo em turmas fechadas com inscrição do aluno

Rotas principais no frontend:

- `/` — dashboard acadêmico
- `/conteudos` — biblioteca
- `/provas` — simulados
- `/mentorias` — turmas ao vivo
- `/assistente` — chat educacional
- `/login` — autenticação

## Testes

Requer **PostgreSQL com pgvector** acessível (ex.: `docker compose up -d`). O pytest usa o banco `doctor_mind_test` (criado automaticamente na primeira execução, se o usuário tiver permissão).

**Backend** (PostgreSQL com banco `doctor_mind_test` acessível; no primeiro `docker compose up` o script `docker/postgres-init` cria o banco; volumes antigos podem exigir `docker compose down -v` ou `CREATE DATABASE` manual):

```bash
pip install -r requirements.txt
# Na raiz do repositório (define PYTEST_DISABLE_PLUGIN_AUTOLOAD e PYTHONPATH):
make test-backend
# Ou manualmente:
cd backend && PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=. python -m pytest tests/ -v
```

Variáveis opcionais: `TEST_DATABASE_URL`, `DATABASE_CONNECT_TIMEOUT` (padrão 12s nos testes via `conftest`).

**Frontend**:

```bash
cd frontend
npm install
npm run test
npm run build
```

Ou `make test-frontend` a partir da raiz.

A **CI** (`/.github/workflows/ci.yml`) roda testes Pytest, Vitest e build do Next.

## Estrutura do repositório

- `backend/app` — API REST: auth, conteúdos, provas, plano de estudo, chat e mentorias
- `frontend/src` — dashboard, biblioteca, provas, mentorias e assistente
- `docker-compose.yml` — PostgreSQL com pgvector

## Observações

- O conteúdo é **educacional**; respostas devem ser validadas com protocolos institucionais e bulas.
- As mentorias são modeladas como turmas fechadas; a experiência ao vivo usa URL de reunião externa no MVP.
- Para produção, configure HTTPS, pagamentos reais, política de acesso, backups e governança de dados clínicos.
