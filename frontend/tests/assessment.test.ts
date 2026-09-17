import { describe, expect, it } from "vitest";
import { AssessmentInput, assessLocally, validateDescription, validateQuestions } from "../lib/assessment";

const baseline: AssessmentInput = {
  description: "Match customer email addresses with a partner for campaign measurement.",
  dataTypes: ["emails"],
  externalAccess: "yes",
  rawExchange: "no",
  dataMovement: "no",
  combined: "no",
  secondaryUse: "no",
  purpose: "matching",
};

describe("assessment rubric", () => {
  it("maps a partner matching use case to medium risk", () => {
    const result = assessLocally(baseline, "2026-09-14T12:00:00.000Z");
    expect(result.score).toBe(38);
    expect(result.level).toBe("MEDIUM");
    expect(result.capabilities).toContain("Protected matching");
    expect(result.rulesVersion).toBe("1.0");
    expect(new Set(result.factors.map((factor) => factor.ruleId))).toEqual(
      new Set(["DATA_SENSITIVITY_DIRECT", "EXTERNAL_ACCESS", "PURPOSE_MATCHING"]),
    );
  });

  it("scores a low-risk internal analytics use case", () => {
    const result = assessLocally(
      { ...baseline, externalAccess: "no", purpose: "analytics" },
      "2026-09-14T12:00:00.000Z",
    );
    expect(result.score).toBe(16); // direct identifiers (14) + analytics (2)
    expect(result.level).toBe("LOW");
  });

  it("caps a regulated high-risk use case at 100", () => {
    const result = assessLocally({
      ...baseline,
      dataTypes: ["health", "financial"],
      rawExchange: "yes",
      dataMovement: "yes",
      combined: "yes",
      secondaryUse: "yes",
      purpose: "ai",
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("HIGH");
    expect(result.limitations).toHaveLength(2);
  });

  it("treats data-sensitivity rules as mutually exclusive", () => {
    const result = assessLocally({ ...baseline, dataTypes: ["names", "health"] }, "2026-09-14T12:00:00.000Z");
    const ruleIds = new Set(result.factors.map((factor) => factor.ruleId));
    expect(ruleIds.has("DATA_SENSITIVITY_HIGH")).toBe(true);
    expect(ruleIds.has("DATA_SENSITIVITY_DIRECT")).toBe(false);
  });

  it("produces identical results for identical input", () => {
    const first = assessLocally(baseline, "2026-09-14T12:00:00.000Z");
    const second = assessLocally(baseline, "2026-09-14T12:00:00.000Z");
    expect(first).toEqual(second);
  });

  it("provides plain-language validation", () => {
    expect(validateDescription("short")).toMatch(/more detail/i);
    expect(validateQuestions({ ...baseline, rawExchange: "" })).toMatch(/each Yes or No/i);
  });
});
