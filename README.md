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

## Deploy na Vercel

O repositório está preparado para deploy em **dois projetos Vercel**:

- `frontend/` como projeto Next.js
- `backend/` como projeto FastAPI/Python

### 1. Projeto `backend`

No dashboard da Vercel, crie um projeto apontando para este repositório com **Root Directory** = `backend`.

Arquivos relevantes:

- `backend/index.py` expõe a aplicação FastAPI no entrypoint que a Vercel reconhece
- `backend/vercel.json` limita o bundle da função Python

Variáveis recomendadas no projeto `backend`:

```bash
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME
CORS_ORIGINS=https://SEU-FRONTEND.vercel.app
# Opcional para liberar previews da Vercel:
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
CORS_ALLOW_CREDENTIALS=false

# Primeiros deploys / ambiente demo
AUTO_INIT_DB=true
AUTO_SEED_DEMO_DATA=true

# Chat/RAG só funciona se existir uma instância acessível pela internet
OLLAMA_BASE_URL=https://seu-ollama-ou-gateway.exemplo.com
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text
```

Observações:

- `DATABASE_URL` precisa apontar para um PostgreSQL com extensão `pgvector`
- `AUTO_INIT_DB` e `AUTO_SEED_DEMO_DATA` podem ser desativados depois da inicialização inicial para reduzir trabalho em cold start
- se `OLLAMA_BASE_URL` não estiver acessível pela internet, a API sobe normalmente, mas o chat/RAG fica indisponível

### 2. Projeto `frontend`

Crie outro projeto na Vercel com **Root Directory** = `frontend`.

Variável obrigatória:

```bash
NEXT_PUBLIC_API_URL=https://SEU-BACKEND.vercel.app
```

Se essa variável não for definida, o frontend usa:

- `http://127.0.0.1:8000` em desenvolvimento local
- a mesma origem (`/api/...`) fora do ambiente local

### 3. Fluxo sugerido

1. Suba o `backend` primeiro e valide `https://SEU-BACKEND.vercel.app/health`
2. Configure `NEXT_PUBLIC_API_URL` no `frontend`
3. Faça o deploy do `frontend`
4. Ajuste `CORS_ORIGINS` no `backend` para a URL final do frontend

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
