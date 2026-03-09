.PHONY: test test-unit test-integration test-validation install

install:
	cd backend && pip install -r requirements.txt

test:
	cd backend && python -m pytest tests/ -v --tb=short

test-unit:
	cd backend && python -m pytest tests/unit/ -v --tb=short

test-integration:
	cd backend && python -m pytest tests/integration/ -v --tb=short

test-validation:
	cd backend && python -m pytest tests/validation/ -v --tb=short

run-backend:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && npm run dev
