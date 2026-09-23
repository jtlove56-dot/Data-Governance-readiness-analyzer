# Deployment Notes

Karlsgate uses separate frontend and backend hosting so each service can scale and deploy independently.

## Frontend Preview

Recommended target: Vercel or another Next.js-compatible host.

Required environment variables:

- `NEXT_PUBLIC_API_BASE_URL` - URL for the deployed backend API.
- `NEXT_PUBLIC_APP_ENV` - `preview`, `staging`, or `production`.

Preview deployments should be created for pull requests. Staging should point to the staging backend URL.

## Backend Staging

Recommended target: Render, Fly.io, Railway, or another Python web-service host.

Required environment variables:

- `KARLSGATE_ENV` - `staging` or `production`.
- `KARLSGATE_VERSION` - release version or commit SHA.
- `CORS_ORIGINS` - comma-separated list of allowed frontend origins.

Backend staging must expose:

- `/health`
- `/version`

## Release Readiness

Before a sprint review or stakeholder demo:

1. Confirm the frontend preview can load.
2. Confirm the frontend can call the backend `/health` endpoint.
3. Run frontend linting, type checks, and tests.
4. Run backend linting, type checks, and tests.
5. Confirm no secrets are stored in source control.
