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
  label: string;
  points: number;
};

export type AssessmentResult = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
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

const purposePoints: Record<Purpose, number> = {
  analytics: 2,
  research: 4,
  matching: 6,
  other: 6,
  marketing: 8,
  ai: 10,
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

export function assessLocally(input: AssessmentInput, assessedAt = new Date().toISOString()): AssessmentResult {
  const factors: RiskFactor[] = [];
  const highSensitivity = input.dataTypes.some((item) => ["gov", "health", "financial"].includes(item));
  const directIdentifiers = input.dataTypes.some((item) => ["names", "emails", "phone"].includes(item));

  if (highSensitivity) factors.push({ label: "Regulated or highly sensitive information", points: 28 });
  else if (directIdentifiers) factors.push({ label: "Direct personal identifiers", points: 14 });
  if (input.externalAccess === "yes") factors.push({ label: "Access by another organization", points: 18 });
  if (input.rawExchange === "yes") factors.push({ label: "Raw identifier exchange", points: 18 });
  if (input.dataMovement === "yes") factors.push({ label: "Data leaves its controlled environment", points: 12 });
  if (input.combined === "yes") factors.push({ label: "Re-identification potential from data combination", points: 12 });
  if (input.secondaryUse === "yes") factors.push({ label: "Reuse beyond the stated purpose", points: 12 });
  factors.push({ label: `Intended use: ${PURPOSE_LABELS[input.purpose]}`, points: purposePoints[input.purpose] });

  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  const level = score < 30 ? "LOW" : score < 60 ? "MEDIUM" : "HIGH";
  const guidance = level === "LOW"
    ? "Standard safeguards and an accountable owner are likely sufficient."
    : level === "MEDIUM"
      ? "Proceed only after the listed controls and an accountable review are in place."
      : "Pause implementation until privacy, security, and governance controls are approved.";

  const recommendations = [
    "Limit access to named roles and review permissions regularly.",
    "Collect and share only the fields required for the approved purpose.",
    "Set retention, deletion, and incident-response responsibilities before launch.",
    "Record the approved purpose, data owner, and control evidence in the governance register.",
  ];
  const capabilities = ["Data minimization", "Governance policy execution"];

  if (highSensitivity) {
    recommendations.unshift("De-identify sensitive records before they leave the originating system.");
    capabilities.unshift("De-identification");
  }
  if (input.combined === "yes") {
    recommendations.unshift("Measure and remediate re-identification risk before combining datasets.");
    capabilities.unshift("Re-identification risk remediation");
  }
  if (input.externalAccess === "yes" && (input.rawExchange === "yes" || input.purpose === "matching")) {
    recommendations.unshift("Use protected matching instead of transferring raw identifiers.");
    capabilities.unshift("Protected matching");
  }
  if (input.secondaryUse === "yes") recommendations.push("Create a separate approval gate for any secondary use.");

  const limitations: string[] = [];
  if (input.dataTypes.includes("health")) limitations.push("HIPAA applicability and required agreements need specialist review; this MVP does not determine compliance.");
  if (input.dataTypes.includes("financial")) limitations.push("PCI DSS scope depends on the exact account data involved; this MVP does not determine compliance.");

  return {
    score,
    level,
    guidance,
    factors,
    recommendations: [...new Set(recommendations)],
    capabilities: [...new Set(capabilities)],
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

