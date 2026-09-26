# Data Governance Readiness Analyzer

A guided, plain-language assessment for identifying privacy and governance risks before a proposed data use case moves forward.

## Architecture

- `frontend/` — Next.js App Router, React, TypeScript, and Tailwind CSS
- `backend/` — FastAPI health and version service
- `docs/` — versioned scoring rubric, capability language, deployment guidance, [data handling and retention](docs/data-handling.md), and the [accessibility review](docs/accessibility-review.md)
- `.github/workflows/ci.yml` — frontend and backend quality gates

The original single-file prototype remains at `data-governance-readiness-analyzer.html` for reference. The supported application is the TypeScript frontend in `frontend/`.

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health` or `http://localhost:8000/version`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000`.

## Quality checks

```bash
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

```bash
cd backend
pytest
```

## Deployment

Deployment configuration and environment requirements are documented in [docs/deployment.md](docs/deployment.md). Do not commit credentials or production-sensitive data.


gbgh