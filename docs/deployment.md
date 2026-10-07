# Deployment and environments

## Recommended topology

| Layer | Local | Preview / staging | Production |
| --- | --- | --- | --- |
| Next.js + TypeScript frontend | `next dev` | Vercel preview deployment | Vercel production deployment |
| FastAPI service | Uvicorn | Render preview/staging service | Render web service |

FastAPI calculates assessments in memory and is required for scoring. There is no database or authentication service. Docker packages the backend for Render; local development runs directly with Uvicorn.

## Frontend

Create a Vercel project with `frontend` as the root directory. Set:

- `NEXT_PUBLIC_API_BASE_URL` to the public FastAPI base URL.

This value is embedded in the browser bundle at build time, so configure it before building each deployment. There is no browser scoring fallback.

For a frontend Docker deployment, pass the API URL as a build argument:

```bash
docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_HOST -t governance-frontend ./frontend
```

Every pull request receives a preview URL when Vercel’s Git integration is enabled. `frontend/vercel.json` declares the framework and build command.

## Backend

The root `render.yaml` defines a Docker-based FastAPI service. Set this environment variable in the host dashboard:

- `ALLOWED_ORIGINS`: comma-separated exact frontend origins.
- `MAX_REQUEST_BYTES`: maximum accepted request-body size; defaults to `16384` bytes. Keep the platform proxy limit at or below this value when possible.

The service exposes `/health`, `/version`, `/docs`, and `POST /assessments`.

## Secrets

- Commit only `.env.example` files.
- Store environment values in Vercel, Render, and GitHub encrypted settings.
- Keep staging and production configuration separate.
