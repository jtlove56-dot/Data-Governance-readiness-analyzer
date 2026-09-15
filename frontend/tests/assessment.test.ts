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

  it("provides plain-language validation", () => {
    expect(validateDescription("short")).toMatch(/more detail/i);
    expect(validateQuestions({ ...baseline, rawExchange: "" })).toMatch(/each Yes or No/i);
  });
});

