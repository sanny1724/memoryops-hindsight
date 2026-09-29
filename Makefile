# MemoryOps — Developer Makefile
# Shortcuts for common development tasks.
# Requires: Python (with pip), Node.js (with npm), uvicorn on PATH.

.PHONY: help install-backend install-frontend install test backend frontend dev clean

# Default target
help:
	@echo ""
	@echo "  MemoryOps — Available Commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make install          Install all dependencies (backend + frontend)"
	@echo "  make install-backend  Install Python backend dependencies"
	@echo "  make install-frontend Install Node frontend dependencies"
	@echo "  make test             Run backend test suite"
	@echo "  make backend          Start FastAPI backend on port 8000"
	@echo "  make frontend         Start Vite dev server on port 5173"
	@echo "  make dev              Print instructions to run both servers"
	@echo "  make clean            Remove Python __pycache__ and .pytest_cache"
	@echo ""

install: install-backend install-frontend

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

test:
	cd backend && python -m pytest tests/ -v

backend:
	cd backend && uvicorn main:app --host 127.0.0.1 --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo ""
	@echo "  Start the backend (terminal 1):"
	@echo "    make backend"
	@echo ""
	@echo "  Start the frontend (terminal 2):"
	@echo "    make frontend"
	@echo ""
	@echo "  Then open: http://localhost:5173"
	@echo ""

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned __pycache__ and .pytest_cache"
