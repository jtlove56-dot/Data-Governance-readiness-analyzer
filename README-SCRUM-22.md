# SCRUM 22: Local Authentication Integration

Open **http://localhost:3002/login** after running `Start-SCRUM-22.ps1`.

This is a standalone local copy of the integrated SCRUM 12 branch at ad0988b.
It has no `.git` directory or remote. Nothing in this folder has been pushed to GitHub.
The existing `scrum 9` and `scrum 12` folders are unchanged.

## Status and Scope

- Email/password sign-in for existing, confirmed Supabase accounts. No public registration.
- Next.js server checks protect `/`; FastAPI independently protects assessment operations.
- Same-origin browser API with an HttpOnly session cookie. Provider tokens never reach browser JavaScript.
- Server-side session revocation, 30-minute idle timeout, eight-hour absolute limit (proposed defaults).
- Session persistence across refreshes and backend restarts, encrypted provider tokens, hashed application tokens.
- Logout/expiry clear drafts and results; separate sessions cannot inherit drafts.
- Existing scoring, approved SCRUM 12 mapping, and PDF generation retained.

**Not yet configured:** a real Supabase project. The application fails closed with an unavailable message.
There is no demo password, fake-login switch, or bypass in the application.
Automated tests inject a test-only identity provider into isolated applications.

**Local storage only:** the session adapter uses SQLite for a single local instance.
Hosted environments are deliberately rejected. Before deployment, replace it with shared production session
storage, review concurrency, add infrastructure-level abuse controls, and test HTTPS with the real provider.
Account registration/recovery UI, MFA, organization roles, and saved assessment history are not included.

## First-Time Setup (PowerShell)

```powershell
cd 'C:\Users\mideo\Downloads\Karlsgate project\scrum 22'
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -e './backend[dev]'
cd frontend
npm ci
cd ..
.\scripts\setup-local.ps1
.\Start-SCRUM-22.ps1
```

The setup script generates cryptographic keys in ignored local environment files and will never overwrite them.
Use the exact localhost URL above: the proxy checks the request Origin against `APP_ORIGIN`.
The local server ports are 3002 and 8002 to avoid SCRUM 9 and SCRUM 12.

## When Supabase Is Available

1. Create a non-production Supabase project. Enable email/password sign-in.
2. Create a confirmed test client through the Supabase dashboard. Disable public signups if accounts are invite-only.
3. Edit `backend/.env`: set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. A legacy anon key also works.
4. Never use the service-role key here. Never paste passwords or environment files into chat or GitHub.
5. Restart the backend and test valid login, invalid login, refresh, logout, expiry, and direct unauthorized API calls.

Supabase verifies credentials and refreshes its provider session. Our backend owns the application's opaque
session, idle/absolute deadlines, and immediate local revocation. This is intentionally a server-only flow,
not a browser Supabase SDK session. Passwords are sent only for login and never stored.

## Security and Privacy

- All state-changing browser API requests require an exact trusted Origin; authenticated responses are not cached.
- FastAPI requires a server-to-server key and a valid opaque session, not a user ID supplied by the browser.
- Passwords, cookies, authorization headers, and provider responses must not be logged.
- The local database contains user ID, email, session timestamps, token hashes and encrypted provider tokens.
  It does not contain questionnaire answers or saved reports. Keep `.local`, `.env`, and `.env.local` private.
- Expired session and rate-limit records are removed on authentication traffic; SQLite secure deletion is enabled.
  If the app is not running, encrypted records can remain on disk. A scheduled purge is required before hosting.
- Logout commits local revocation before contacting Supabase, so a provider outage cannot revive access.
- Invalid credentials use the same message for missing accounts and wrong passwords.
- A database-backed local limiter allows five attempts per normalized email and 100 total per 15-minute window.
  This is a local baseline, not a substitute for production edge/IP rate limiting and monitoring.
- Passive polling never extends the idle timer. Browser activity and scoring requests may extend it, never beyond eight hours.
- Supabase-side revocation/account policy changes may take until token refresh to propagate. Application logout is immediate.
- Closing a tab removes its assessment draft but does not promise to end the login session. Sign out on shared devices.

## Verification

```powershell
cd backend
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check .
cd ../frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Before a later PR to `dev`: obtain stakeholder agreement on session durations and account provisioning,
integrate production storage, run a real Supabase/HTTPS end-to-end test, and coordinate with SCRUM 16 and
the owner of final deployment testing. A login feature does not add saved assessment history.
