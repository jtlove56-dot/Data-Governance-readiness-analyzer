import type { AssessmentResult } from "../lib/assessment";

export const assessmentResult: AssessmentResult = {
  schemaVersion: "1.0",
  rulesVersion: "1.0",
  score: 100,
  level: "HIGH",
  guidance: "Pause implementation until privacy, security, and governance controls are approved.",
  factors: [
    {
      ruleId: "DATA_SENSITIVITY_HIGH",
      category: "data_sensitivity",
      label: "Regulated or highly sensitive information",
      points: 28,
    },
    {
      ruleId: "EXTERNAL_ACCESS",
      category: "access",
      label: "Access by another organization",
      points: 18,
    },
    {
      ruleId: "RAW_EXCHANGE",
      category: "access",
      label: "Raw identifier exchange",
      points: 18,
    },
    { ruleId: "DATA_MOVEMENT", category: "movement", label: "Data leaves its controlled environment", points: 12 },
    { ruleId: "COMBINED_REIDENTIFICATION", category: "reidentification", label: "Re-identification potential from data combination", points: 12 },
    { ruleId: "SECONDARY_USE", category: "purpose", label: "Reuse beyond the stated purpose", points: 12 },
    { ruleId: "PURPOSE_RESEARCH", category: "purpose", label: "Intended use: Research", points: 4 },
  ],
  recommendations: [
    "Use protected matching instead of transferring raw identifiers.",
    "Measure and remediate re-identification risk before combining datasets.",
    "De-identify sensitive records before they leave the originating system.",
    "Limit access to named roles and review permissions regularly.",
    "Collect and share only the fields required for the approved purpose.",
    "Set retention, deletion, and incident-response responsibilities before launch.",
    "Record the approved purpose, data owner, and control evidence in the governance register.",
    "Create a separate approval gate for any secondary use.",
  ],
  capabilities: [
    "Protected matching",
    "Re-identification risk remediation",
    "De-identification",
    "Data minimization",
    "Governance policy execution",
  ],
  limitations: [
    "HIPAA applicability and required agreements need specialist review; this MVP does not determine compliance.",
    "PCI DSS scope depends on the exact account data involved; this MVP does not determine compliance.",
  ],
  assessedAt: "2026-09-23T15:00:00.000Z",
};
