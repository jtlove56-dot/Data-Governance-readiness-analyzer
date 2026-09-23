# Questionnaire acceptance coverage

The home page is a four-step questionnaire followed by an editable review.
The project owner confirmed that there is no approved scoring rubric yet.
It implements the fields visible in the provided Jira ticket. This request
contract is a proposed v1 contract, not a claim of team approval.

| Acceptance criterion | Implementation and evidence |
| --- | --- |
| Every approved scoring input is collected | All seven categories visible in the ticket are collected. **Pending:** compare with the team's approved rubric, which was not supplied. |
| Multiple applicable data types | Checkboxes for names, email, health, financial, location, online identifiers, other, and types not yet known. |
| Required questions cannot be skipped | Required text, choices, and conditional details are validated before moving forward and on API submission. Whitespace-only answers are rejected. |
| Answers persist between steps | React state retains answers through Back, step navigation, review edits, failed submissions, and returning from the receipt. No browser refresh persistence or database storage is claimed. |
| Understandable wording | Plain-language questions, examples, and explanations of identifying information, secondary use, and re-identification. Yes/no questions offer an explicit Not sure choice. Team/user wording review remains advisable. |
| Submitted answers match backend schema | `AssessmentRequest` defines the strict v1 model. Frontend and backend tests share `shared/assessment-example.json`; the UI submission is asserted against that fixture and the API validates it. |

## Field mapping

| Ticket requirement | Request fields |
| --- | --- |
| Data types | `data_types`, `other_data_types` |
| Participating people and organizations | `people`, `organizations` |
| Access by another organization | `external_access`, `external_access_details` |
| Raw identifiable data exchange | `identifiable_exchange` |
| Movement between participants or systems | `data_movement` |
| Intended purpose and expected output | `purpose`, `expected_output` |
| Secondary use and re-identification | `secondary_use`, `secondary_use_details`, `reidentification`, `reidentification_details` |

## API

`POST /assessments` accepts the shared JSON example using schema version `1.0`.
Text is trimmed and limited to 2,000 characters. Required text cannot be blank.
Choice fields accept `yes`, `no`, or `unsure`. At least one known data-type code
is required; duplicates are rejected. Other data requires an explanation.
Yes answers for external access, secondary use, and re-identification require
follow-up details. Unknown request fields and schema versions are rejected.

Successful requests return HTTP 200 with a UUID `submission_id`,
`status: validated`, `schema_version: 1.0`, `stored: false`, and `scored: false`.
The UUID identifies a validation response, not a stored assessment record.
Invalid requests receive HTTP 422. The API schema is available in `/docs` and
`/openapi.json`. CORS allows POST from configured frontend origins.

The frontend uses `NEXT_PUBLIC_API_BASE_URL`; it retains answers after a service
failure and permits retry. Requests time out after 15 seconds. Pending requests
disable navigation and repeated submission. Answers exist in page memory only;
refreshing or closing the page clears them. No sensitive input is stored in
localStorage, URLs, or application logs.

## Remaining team integration

Obtain the approved scoring rubric and any pre-existing assessment schema.
Compare each required scoring input with the mapping above, resolve additions
with the team, and update the shared contract tests. Do not mark the first
acceptance criterion complete until this comparison is signed off. Scoring,
authentication, and durable assessment storage remain separate work.

## Verification

Run `pnpm check` from the project root. From `backend`, run
`.venv/Scripts/python.exe -m ruff check .`,
`.venv/Scripts/python.exe -m mypy app`, and
`.venv/Scripts/python.exe -m pytest` on Windows.
