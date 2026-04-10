.PHONY: test-backend test-frontend test docker-up docker-down docker-logs

# Evita travamento ao carregar o plugin pytest-anyio em alguns ambientes (import indireto de httpx).
test-backend:
	cd backend && PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=. ./.venv/bin/python -m pytest tests/ -v --tb=short

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=100
