# SCRUM 22 Local Verification

Date: October 21, 2026. Scope: local implementation only; nothing published to GitHub.

## Results

- Backend: 89 passing tests, including 13 authentication tests. Ruff passed.
- Frontend: 126 passing tests, including sign-in, draft isolation, proxy/cookie, and CSRF tests.
- TypeScript and ESLint passed. Next.js 16.4.0 production compilation passed.
- Browser check in headless Microsoft Edge passed using an explicitly launched test-only provider.
- Normal application verified separately: unauthenticated `/` redirects to login; missing Supabase
  configuration returns a generic unavailable message and does not accept the test credentials.

## Browser Coverage

Protected initial navigation; indistinguishable invalid-login errors; successful test login; HttpOnly cookie;
refresh and draft retention; real FastAPI scoring and approved SCRUM 12 recommendations; PDF download;
logout across two tabs; cleared drafts; old-session replay rejected; cross-origin POST rejected;
desktop 1365x900 and mobile 375x812 sign-in layout with no horizontal overflow.

Screenshots and downloaded test PDF are local artifacts under `.local/browser-check/` (not for source control).
The PDF test verifies generation/download; it is not a new full visual audit of every report page.

## Reproducing the Browser Check

The fixture `backend/tests/browser_fixture.py` uses a temporary database and a fake provider from the
backend test suite. It only starts with `SCRUM22_BROWSER_TEST=1`; the normal app never loads it.
Start it from `backend/` with the local virtual environment; it binds 127.0.0.1:8012.

Run a separate Next.js dev server on localhost:3012 with `API_BASE_URL=http://127.0.0.1:8012`
and `APP_ORIGIN=http://localhost:3012`, retaining the generated server-to-server key.
Do not run two dev servers against the same `.next` directory at once.

Run `node scripts/browser-auth-check.cjs` with Playwright available and Microsoft Edge installed.
`PLAYWRIGHT_MODULE` may point to an existing Playwright installation. Stop both test servers afterwards.
They were stopped after verification; the normal local application runs on ports 3002/8002.

## Not Yet Verified / Remaining Decisions

- Real Supabase credentials, login, refresh, password recovery and provider outages against a configured project.
- HTTPS Secure-cookie behavior and deployed frontend/backend connectivity.
- Stakeholder approval of proposed 30-minute idle and eight-hour maximum session duration.
- Account provisioning policy and recovery workflow (currently administrator-managed).
- Production shared session storage, scheduled deletion, infrastructure rate limits and operational monitoring.
- Independent security/accessibility review; this test evidence is not a security certification.
- Saved assessment history and client/team authorization are separate scope. No assessment records exist here.

The local SQLite adapter deliberately refuses hosted APP_ENV values. Do not remove that guard to deploy.
The full ticket should remain in progress until real-provider and hosted acceptance checks are complete.
