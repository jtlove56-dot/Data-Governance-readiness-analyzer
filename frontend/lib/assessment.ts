export const DATA_TYPE_LABELS = {
  names: "Names",
  emails: "Email addresses",
  phone: "Phone numbers",
  gov: "Government identifiers",
  health: "Health information",
  financial: "Financial information",
} as const;

export const PURPOSE_LABELS = {
  matching: "Customer or record matching",
  ai: "AI model training or development",
  analytics: "Internal analytics",
  marketing: "Marketing or advertising",
  research: "Research",
  other: "Other",
} as const;

export type DataType = keyof typeof DATA_TYPE_LABELS;
export type Purpose = keyof typeof PURPOSE_LABELS;
export type YesNo = "yes" | "no";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type AssessmentInput = {
  description: string;
  dataTypes: DataType[];
  externalAccess: YesNo | "";
  rawExchange: YesNo | "";
  dataMovement: YesNo | "";
  combined: YesNo | "";
  secondaryUse: YesNo | "";
  purpose: Purpose;
};

export type RiskFactor = {
  ruleId: string;
  category: string;
  label: string;
  points: number;
};

export type AssessmentResult = {
  schemaVersion: string;
  rulesVersion: string;
  score: number;
  level: RiskLevel;
  guidance: string;
  factors: RiskFactor[];
  recommendations: string[];
  capabilities: string[];
  limitations: string[];
  assessedAt: string;
};

export const EMPTY_INPUT: AssessmentInput = {
  description: "",
  dataTypes: [],
  externalAccess: "",
  rawExchange: "",
  dataMovement: "",
  combined: "",
  secondaryUse: "",
  purpose: "matching",
};

export function validateDescription(value: string): string | null {
  const length = value.trim().length;
  if (length === 0) return "Describe the proposed data use case before continuing.";
  if (length < 20) return "Add a little more detail—include the data, who will use it, and why.";
  if (length > 1000) return "Keep the description to 1,000 characters or fewer.";
  return null;
}

export function validateQuestions(input: AssessmentInput): string | null {
  if (input.dataTypes.length === 0) return "Select at least one type of information.";
  if (!input.externalAccess || !input.rawExchange || !input.dataMovement || !input.combined || !input.secondaryUse) {
    return "Answer each Yes or No question before assessing the use case.";
  }
  return null;
}

/**
 * Local fallback engine, kept equivalent to the backend rule table in
 * backend/app/scoring/rules.py (rulesVersion "1.0"). Used only when the
 * scoring API is unreachable; see requestAssessment below.
 */

const SCHEMA_VERSION = "1.0";
const RULES_VERSION = "1.0";

const HIGH_SENSITIVITY_TYPES: readonly DataType[] = ["gov", "health", "financial"];
const DIRECT_IDENTIFIER_TYPES: readonly DataType[] = ["names", "emails", "phone"];

type Rule = {
  id: string;
  category: string;
  label: string;
  points: number;
  applies: (input: AssessmentInput) => boolean;
};

type Capability = {
  id: string;
  label: string;
  applies: (input: AssessmentInput) => boolean;
  recommendation?: string;
};

type Limitation = {
  id: string;
  copy: string;
  applies: (input: AssessmentInput) => boolean;
};

function hasHighSensitivity(input: AssessmentInput): boolean {
  return input.dataTypes.some((item) => HIGH_SENSITIVITY_TYPES.includes(item));
}

function hasDirectIdentifiersOnly(input: AssessmentInput): boolean {
  return !hasHighSensitivity(input) && input.dataTypes.some((item) => DIRECT_IDENTIFIER_TYPES.includes(item));
}

function usesProtectedMatching(input: AssessmentInput): boolean {
  return input.externalAccess === "yes" && (input.rawExchange === "yes" || input.purpose === "matching");
}

const RULES: Rule[] = [
  { id: "DATA_SENSITIVITY_HIGH", category: "data_sensitivity", label: "Regulated or highly sensitive information", points: 28, applies: hasHighSensitivity },
  { id: "DATA_SENSITIVITY_DIRECT", category: "data_sensitivity", label: "Direct personal identifiers", points: 14, applies: hasDirectIdentifiersOnly },
  { id: "EXTERNAL_ACCESS", category: "access", label: "Access by another organization", points: 18, applies: (input) => input.externalAccess === "yes" },
  { id: "RAW_EXCHANGE", category: "access", label: "Raw identifier exchange", points: 18, applies: (input) => input.rawExchange === "yes" },
  { id: "DATA_MOVEMENT", category: "movement", label: "Data leaves its controlled environment", points: 12, applies: (input) => input.dataMovement === "yes" },
  { id: "COMBINED_REIDENTIFICATION", category: "reidentification", label: "Re-identification potential from data combination", points: 12, applies: (input) => input.combined === "yes" },
  { id: "SECONDARY_USE", category: "purpose", label: "Reuse beyond the stated purpose", points: 12, applies: (input) => input.secondaryUse === "yes" },
  { id: "PURPOSE_ANALYTICS", category: "purpose", label: "Intended use: Internal analytics", points: 2, applies: (input) => input.purpose === "analytics" },
  { id: "PURPOSE_RESEARCH", category: "purpose", label: "Intended use: Research", points: 4, applies: (input) => input.purpose === "research" },
  { id: "PURPOSE_MATCHING", category: "purpose", label: "Intended use: Customer or record matching", points: 6, applies: (input) => input.purpose === "matching" },
  { id: "PURPOSE_OTHER", category: "purpose", label: "Intended use: Other", points: 6, applies: (input) => input.purpose === "other" },
  { id: "PURPOSE_MARKETING", category: "purpose", label: "Intended use: Marketing or advertising", points: 8, applies: (input) => input.purpose === "marketing" },
  { id: "PURPOSE_AI", category: "purpose", label: "Intended use: AI model training or development", points: 10, applies: (input) => input.purpose === "ai" },
];

// Priority order: protected matching, then re-identification remediation,
// then de-identification, then the two controls that always apply.
const CAPABILITIES: Capability[] = [
  {
    id: "PROTECTED_MATCHING",
    label: "Protected matching",
    applies: usesProtectedMatching,
    recommendation: "Use protected matching instead of transferring raw identifiers.",
  },
  {
    id: "REID_REMEDIATION",
    label: "Re-identification risk remediation",
    applies: (input) => input.combined === "yes",
    recommendation: "Measure and remediate re-identification risk before combining datasets.",
  },
  {
    id: "DEIDENTIFICATION",
    label: "De-identification",
    applies: hasHighSensitivity,
    recommendation: "De-identify sensitive records before they leave the originating system.",
  },
  { id: "DATA_MINIMIZATION", label: "Data minimization", applies: () => true },
  { id: "GOVERNANCE_EXECUTION", label: "Governance policy execution", applies: () => true },
];

const LIMITATIONS: Limitation[] = [
  {
    id: "HIPAA_REVIEW",
    copy: "HIPAA applicability and required agreements need specialist review; this MVP does not determine compliance.",
    applies: (input) => input.dataTypes.includes("health"),
  },
  {
    id: "PCI_REVIEW",
    copy: "PCI DSS scope depends on the exact account data involved; this MVP does not determine compliance.",
    applies: (input) => input.dataTypes.includes("financial"),
  },
];

const BASE_RECOMMENDATIONS = [
  "Limit access to named roles and review permissions regularly.",
  "Collect and share only the fields required for the approved purpose.",
  "Set retention, deletion, and incident-response responsibilities before launch.",
  "Record the approved purpose, data owner, and control evidence in the governance register.",
];

const EXTRA_RECOMMENDATIONS: { id: string; copy: string; applies: (input: AssessmentInput) => boolean }[] = [
  {
    id: "SECONDARY_USE_GATE",
    copy: "Create a separate approval gate for any secondary use.",
    applies: (input) => input.secondaryUse === "yes",
  },
];

const THRESHOLDS = { lowMax: 29, mediumMax: 59 };

const GUIDANCE_BY_LEVEL: Record<RiskLevel, string> = {
  LOW: "Standard safeguards and an accountable owner are likely sufficient.",
  MEDIUM: "Proceed only after the listed controls and an accountable review are in place.",
  HIGH: "Pause implementation until privacy, security, and governance controls are approved.",
};

function levelFor(score: number): RiskLevel {
  if (score <= THRESHOLDS.lowMax) return "LOW";
  if (score <= THRESHOLDS.mediumMax) return "MEDIUM";
  return "HIGH";
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function assessLocally(input: AssessmentInput, assessedAt = new Date().toISOString()): AssessmentResult {
  const factors: RiskFactor[] = RULES.filter((rule) => rule.applies(input)).map((rule) => ({
    ruleId: rule.id,
    category: rule.category,
    label: rule.label,
    points: rule.points,
  }));

  const rawScore = factors.reduce((total, factor) => total + factor.points, 0);
  const score = Math.min(100, rawScore);
  const level = levelFor(score);
  const guidance = GUIDANCE_BY_LEVEL[level];

  const applicableCapabilities = CAPABILITIES.filter((capability) => capability.applies(input));
  const capabilities = unique(applicableCapabilities.map((capability) => capability.label));
  const recommendations = unique([
    ...applicableCapabilities
      .filter((capability): capability is Capability & { recommendation: string } => Boolean(capability.recommendation))
      .map((capability) => capability.recommendation),
    ...BASE_RECOMMENDATIONS,
    ...EXTRA_RECOMMENDATIONS.filter((extra) => extra.applies(input)).map((extra) => extra.copy),
  ]);
  const limitations = LIMITATIONS.filter((limitation) => limitation.applies(input)).map((limitation) => limitation.copy);

  return {
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    score,
    level,
    guidance,
    factors,
    recommendations,
    capabilities,
    limitations,
    assessedAt,
  };
}

export async function requestAssessment(input: AssessmentInput): Promise<AssessmentResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return assessLocally(input);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/assessments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Assessment service returned ${response.status}`);
    return await response.json() as AssessmentResult;
  } catch {
    return assessLocally(input);
  }
}
