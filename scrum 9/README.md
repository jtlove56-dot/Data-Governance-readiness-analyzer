# Karlsgate Project Foundation

## Team Review Copy: SCRUM-9

This folder contains the independently developed SCRUM-9 questionnaire for team
review. Run its setup commands from this folder, or open this folder directly
in VS Code. The repository's existing root frontend and backend are separate.

The team's existing scoring proposal is at
[`../docs/risk-scoring-rubric-v1.0.md`](../docs/risk-scoring-rubric-v1.0.md).
Its approval is pending. This questionnaire uses its own request contract and
must be reconciled with `../backend/app/scoring/models.py` before integration
with the root scoring service. Do not point this questionnaire at that service
and assume its payload is compatible.

The active checks for this folder are in `../.github/workflows/scrum-9.yml`.
The `.github/workflows/ci.yml` inside this folder is the original standalone
project configuration; GitHub does not run nested workflow directories.

This repository is the beginning of the Karlsgate project. It contains a Next.js, TypeScript, and Tailwind CSS frontend plus a Python FastAPI backend with health and version endpoints.

The home page now contains the data-governance questionnaire: data types,
participants, sharing, purpose, editable review, and validated API submission.
See [questionnaire acceptance coverage](docs/questionnaire.md) for the field
mapping, request contract, tests, and the outstanding approved-rubric check.

## Project Layout

- `frontend/` - Next.js app router frontend.
- `backend/` - FastAPI service.
- `.vscode/` - VS Code tasks and recommended settings.
- `.github/workflows/ci.yml` - automated linting, type checking, and tests.
- `docs/deployment.md` - preview and staging deployment notes.

## Prerequisites

- Node.js 20 or newer.
- pnpm 10 or newer.
- Python 3.11 or newer.

## Local Setup

1. Install frontend dependencies:

   ```powershell
   pnpm install
   ```

2. Create and activate the backend virtual environment:

   ```powershell
   python -m venv backend/.venv
   backend/.venv/Scripts/Activate.ps1
   python -m pip install -e "backend[dev]"
   ```

3. Copy the environment templates:

   ```powershell
   Copy-Item frontend/.env.example frontend/.env.local
   Copy-Item backend/.env.example backend/.env
   ```

4. Start the backend:

   ```powershell
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

5. In another terminal, start the frontend:

   ```powershell
   pnpm dev
   ```

6. Open `http://localhost:3000`.

The original frontend-to-backend health check is at `http://localhost:3000/system`.

The frontend reads `NEXT_PUBLIC_API_BASE_URL` from `frontend/.env.local` and
submits questionnaire answers to that backend. Answers persist while moving
between steps, but refreshing the page clears them. Submission validates the
answers; scoring and database storage are not implemented.

## Quality Checks

Run frontend checks:

```powershell
pnpm check
```

Run backend checks from the repository root after activating the backend virtual environment:

```powershell
cd backend
ruff check .
mypy app
pytest
```

## API Endpoints

- `GET /health` returns service health, environment, and version.
- `GET /version` returns the service name and current version.
- `POST /assessments` validates the questionnaire request and returns a receipt.
- `GET /docs` provides the interactive API schema.

After moving this folder, run `pnpm install --force` and recreate/reinstall the
Python virtual environment if its scripts still reference the old location.

## Secrets

Do not commit production credentials or sensitive values. Use `.env.example` files for safe defaults and configure real secrets in the hosting provider or CI/CD environment.
