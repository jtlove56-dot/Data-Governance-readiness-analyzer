# Data handling and retention (v1.0)

Implements SCRUM-16. The analyzer assesses potentially sensitive use cases, so it applies the same data-minimization principle it recommends.

## Decision

v1.0 is **stateless**: assessments are not retained, and there are no accounts. This follows the recorded Sprint 1 position in [deployment.md](deployment.md) ("keeps assessments in the browser and does not persist them until the authentication/storage product decision is approved").

- No authentication is implemented for v1.0.
- The `supabase/migrations` `assessments` table (row-level security, owner-only access) stays unused. Enabling it requires an approved persistence decision, authentication, and an update to this document and to the in-app notice.

## Field inventory

| Field | Purpose | Sent to API | Stored |
| --- | --- | --- | --- |
| `description` | Gives the person context and appears in their on-screen record and downloaded report. Not scored. | **No** | This tab's `sessionStorage` only |
| `dataTypes` | Data-sensitivity rules (`DATA_SENSITIVITY_*`), de-identification, and HIPAA/PCI limitations | Yes | This tab's `sessionStorage` only |
| `externalAccess` | `EXTERNAL_ACCESS` rule and protected-matching fit | Yes | This tab's `sessionStorage` only |
| `rawExchange` | `RAW_EXCHANGE` rule and protected-matching fit | Yes | This tab's `sessionStorage` only |
| `dataMovement` | `DATA_MOVEMENT` rule | Yes | This tab's `sessionStorage` only |
| `combined` | `COMBINED_REIDENTIFICATION` rule and re-identification remediation | Yes | This tab's `sessionStorage` only |
| `secondaryUse` | `SECONDARY_USE` rule and secondary-use approval gate | Yes | This tab's `sessionStorage` only |
| `purpose` | `PURPOSE_*` rules and protected-matching fit | Yes | This tab's `sessionStorage` only |
| `schemaVersion` | API contract versioning | Yes | No |

The API still accepts `description` so older clients keep working, but it is never scored, logged, or returned (`exclude=True`), and the frontend no longer sends it.

## Data flow

1. The person types into the wizard. Input is held in React state and mirrored to `sessionStorage` (`governance-assessment-draft-v2`) so a refresh does not lose work.
2. On **Assess risk**, the browser sends only the scored fields to `POST /assessments` in the request body. Nothing goes in the URL or query string. When the API is unreachable, the same rules run locally in the browser.
3. The API scores the request in memory and returns the result with `Cache-Control: no-store`. Nothing is written to a database.
4. The report is generated entirely in the browser as a Blob and downloaded with a generic filename (`data-governance-assessment.txt`). It is never uploaded.

## Session lifetime and deletion

| Event | Effect |
| --- | --- |
| Tab or window closed | Browser discards `sessionStorage`, so the draft is gone |
| 30 minutes without interaction | Draft and result cleared; the person sees an expiry message |
| Draft older than 30 minutes found on load | Discarded, not restored |
| **Start over** | Draft and result cleared immediately |
| Earlier-build draft in `localStorage` (`-v1`) | Deleted on next visit |

Constants live in `frontend/lib/session.ts` (`IDLE_TIMEOUT_MS`).

## Logs, analytics, URLs, and errors

- **Application logs** (`backend/app/logging_config.py`) record only a random request ID, schema/rules versions, score, level, and fired rule IDs. Raw answers and free text are never logged. Covered by `test_scoring_logs_exclude_questionnaire_input`.
- **Validation errors** report field names only, never submitted values or unknown field names. Covered by `test_invalid_input_returns_clear_client_error_without_echoing_input` and `test_user_controlled_extra_field_name_is_not_echoed_or_logged`.
- **URLs:** assessment content never appears in paths or query strings. The only route is `/`.
- **Analytics and error reporting:** none are installed. Any tool added later must not capture request bodies, form values, or `sessionStorage`.

## Hosted environments

- **Vercel (frontend):** static page. Input stays in the browser.
- **Render (FastAPI):** Uvicorn access logs contain the client address, method, path (`/assessments`), and status, never request bodies. Do not enable request-body logging or debug middleware in staging or production.
- **Supabase:** not used for assessment content in v1.0. Keep the service-role key off the browser and out of the repo (see [deployment.md](deployment.md)).

## What we tell users

The describe step and footer say that answers stay in the browser tab, are not saved on our servers, and are cleared on close, on start over, or after 30 minutes of inactivity. If retention changes, update that copy in `frontend/components/AssessmentWizard.tsx` in the same change.
