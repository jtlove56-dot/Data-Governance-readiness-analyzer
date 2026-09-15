# Risk-scoring rubric v1.0

Status: **implemented proposal; stakeholder approval pending**  
Owner: Product / Privacy  
Applies to: MVP questionnaire and recommendation engine

The score is transparent and deterministic. Add the points for each applicable response, cap the result at 100, and map it to a risk level. A score supports triage; it does not determine legal or regulatory compliance.

## Thresholds

| Score | Level | Decision guidance |
| --- | --- | --- |
| 0–29 | Low | Standard safeguards and an accountable owner are likely sufficient. |
| 30–59 | Medium | Proceed only after recommended controls and an accountable review are in place. |
| 60–100 | High | Pause implementation until privacy, security, and governance controls are approved. |

## Response-to-score mapping

| Factor | Questionnaire response | Points | Rationale |
| --- | --- | ---: | --- |
| Data sensitivity | Any health, financial, or government identifier | 28 | Regulated or high-impact information increases harm and compliance exposure. |
| Data sensitivity | Names, emails, or phone numbers and no high-sensitivity category | 14 | Direct identifiers create privacy and misuse risk. |
| External access | Yes | 18 | A new organization introduces contractual, access, and accountability boundaries. |
| Raw identifier exchange | Yes | 18 | Direct identifiers are exposed in usable form. |
| Data movement | Yes | 12 | Moving data expands the attack surface and complicates control enforcement. |
| Re-identification | Combined with other datasets: Yes | 12 | Linkage may make a person identifiable or reveal additional attributes. |
| Secondary use | Reuse beyond the described purpose: Yes | 12 | Purpose expansion may exceed notice, consent, contract, or policy. |
| Intended use | Internal analytics | 2 | Constrained first-party use has the lowest baseline addition. |
| Intended use | Research | 4 | Research may have governance and publication considerations. |
| Intended use | Record matching | 6 | Linkage introduces identity resolution and disclosure risk. |
| Intended use | Other | 6 | Unclassified uses receive a conservative default. |
| Intended use | Marketing or advertising | 8 | Profiling and targeting raise purpose and consent risk. |
| Intended use | AI training or development | 10 | Model reuse, memorization, lineage, and deletion are harder to govern. |

For mutually exclusive data sensitivity responses, apply only the highest sensitivity score. "No" responses add zero points. Intended use always contributes one value, so every submitted answer has an explicit rule.

## Capability language and applicability

### De-identification

Approved MVP copy: “Transform sensitive records so directly identifying values are not exposed during the approved workflow.”

Apply when health, financial, or government identifiers are selected. De-identification is a control, not a guarantee of anonymity.

### Re-identification risk remediation

Approved MVP copy: “Measure how dataset combination could reveal a person or sensitive attribute, then reduce that risk before release.”

Apply when the user expects data to be combined with other datasets.

### Protected matching

Approved MVP copy: “Identify records shared across parties without transferring raw identifiers to the other party.”

Apply when another organization will access data and either raw exchange is proposed or record matching is the intended use.

### Data minimization

Approved MVP copy: “Limit collection, processing, and disclosure to fields required for the documented purpose.”

Apply to every assessment.

### Governance policy execution

Approved MVP copy: “Turn approved purpose, access, retention, and deletion rules into enforceable workflow controls and evidence.”

Apply to every assessment.

## v1.0 regulated-data limitations

- Health information: the tool flags specialist review but does not determine HIPAA covered-entity status, business-associate obligations, authorization, or Safe Harbor/Expert Determination compliance.
- Financial information: the tool flags specialist review but does not determine whether data is cardholder data, sensitive authentication data, or otherwise in PCI DSS scope.
- The MVP does not replace privacy, security, procurement, legal, or records-management approval.
- Jurisdiction, contractual restrictions, minors’ data, biometrics, precise location, and data volume are not yet scored.

## Review checklist

- [ ] Product owner approves thresholds and decision language.
- [ ] Privacy/legal approves regulated-data limitations.
- [ ] Karlsgate product owner approves capability copy and applicability rules.
- [ ] Engineering confirms frontend and backend implementations remain equivalent.

Any approved change requires a new version of this document plus matching test fixtures in both applications.

