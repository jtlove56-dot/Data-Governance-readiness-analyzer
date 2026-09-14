# Deployment and environments

## Recommended topology

| Layer | Local | Preview / staging | Production |
| --- | --- | --- | --- |
| Next.js + TypeScript frontend | `next dev` | Vercel preview deployment | Vercel production deployment |
| FastAPI service | Uvicorn | Render preview/staging service | Render web service |
| PostgreSQL and Auth | Supabase local stack | Supabase staging project | Supabase production project |

Supabase is the data and identity platform for this architecture. Its hosted Edge Functions use the Deno/TypeScript runtime, so the required Python FastAPI service must run on a Python/container host. If the team later replaces FastAPI with TypeScript Edge Functions, more of the runtime can move to Supabase.

## Frontend

Create a Vercel project with `frontend` as the root directory. Set:

- `NEXT_PUBLIC_API_BASE_URL` to the public FastAPI base URL.
- Future Supabase browser credentials should use publishable/anon keys only; never expose a service-role key.

Every pull request receives a preview URL when Vercel’s Git integration is enabled. `frontend/vercel.json` declares the framework and build command.

## Backend

The root `render.yaml` defines a Docker-based FastAPI service. Set these secrets in the host dashboard:

- `ALLOWED_ORIGINS`: comma-separated exact frontend origins.
- `SUPABASE_URL`: the environment-specific Supabase URL.
- `SUPABASE_SERVICE_ROLE_KEY`: only if server-side persistence is enabled later.

The service exposes `/health`, `/version`, `/docs`, and `POST /assessments`.

## Supabase

Create separate staging and production projects, then link and apply migrations:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The included assessment table has row-level security enabled and grants each authenticated user access only to their own rows. The current MVP keeps assessments in the browser and does not persist them until the authentication/storage product decision is approved.

## Secrets

- Commit only `.env.example` files.
- Store environment values in Vercel, Render, Supabase, and GitHub encrypted settings.
- Never send the Supabase service-role key to the browser.
- Use separate keys and databases for staging and production.

