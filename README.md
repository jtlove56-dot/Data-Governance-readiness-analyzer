# SCRUM 12 - Risk-to-Safeguard Recommendations

**[Open SCRUM 12: http://localhost:3001](http://localhost:3001/)**

This folder contains the team's application plus the SCRUM 12 safeguard-mapping
implementation on the `risk-safeguard-mapping` Git branch, proposed for `dev`.
Stakeholder approval for the SCRUM 12 mappings and capability wording/applicability
was confirmed by the project contributor on October 7, 2026. Current mapping: v1.1.

Looking for the original **SCRUM 9 data-use questionnaire**? It is in `../scrum 9`
and opens at **[http://localhost:3000](http://localhost:3000/)**.

The browser shortcuts require the corresponding development servers to be running.

A guided, plain-language assessment for identifying privacy and governance risks before a proposed data use case moves forward.

## Architecture

- `frontend/` — Next.js App Router, React, TypeScript, and Tailwind CSS
- `backend/` — FastAPI assessment and scoring service
- `docs/` — versioned scoring rubric, capability language, deployment guidance, [data handling and retention](docs/data-handling.md), and the [accessibility review](docs/accessibility-review.md)
- `.github/workflows/ci.yml` — frontend and backend quality gates

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001 python -m uvicorn app.main:app --reload --port 8001
```

On Windows PowerShell, set `$env:ALLOWED_ORIGINS = "http://localhost:3001,http://127.0.0.1:3001"`
and run `python -m uvicorn app.main:app --reload --port 8001` after activating the environment.

Check `http://localhost:8001/health` or `http://localhost:8001/version`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 npm run dev -- --port 3001
```

On Windows PowerShell, set `$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8001"`
and run `npm run dev -- --port 3001`.

Open `http://localhost:3001`. These separate ports let SCRUM 9 run alongside SCRUM 12.

## Quality checks

Risk-to-safeguard mappings and Karlsgate applicability are documented in
[Recommendation mapping v1.1](docs/recommendation-mapping-v1.1.md). The approved catalog is
versioned separately from scoring; v1.0 remains available as the historical pending version.
After editing the canonical backend catalog, regenerate the frontend copy from
the repository root with `python scripts/sync-recommendation-mappings.py`.

```bash
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

```bash
cd backend
python ../scripts/sync-recommendation-mappings.py --check
pytest
```

## Deployment

Deployment configuration and environment requirements are documented in [docs/deployment.md](docs/deployment.md). Do not commit credentials or production-sensitive data.
