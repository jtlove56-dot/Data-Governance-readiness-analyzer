import { afterEach, describe, expect, it, vi } from "vitest";
import { AssessmentInput } from "../lib/assessment";
import { DISCLAIMER, buildReportModel, downloadAssessmentReport, renderAssessmentPdf } from "../lib/report";
import { assessmentResult } from "./assessment-fixture";

const input: AssessmentInput = {
  description: "Share loyalty member emails and health survey answers with a research partner.",
  dataTypes: ["emails", "health"],
  externalAccess: "yes",
  rawExchange: "yes",
  dataMovement: "yes",
  combined: "yes",
  secondaryUse: "yes",
  purpose: "research",
};

const result = assessmentResult;
const model = buildReportModel(input, result);

afterEach(() => vi.restoreAllMocks());

function headings() {
  return model.sections.map((section) => section.heading);
}

function flatten(): string {
  return JSON.stringify(model);
}

describe("report model", () => {
  it("includes every section the ticket requires", () => {
    expect(headings()).toEqual([
      "Use case",
      "Questionnaire responses",
      "Risk assessment",
      "Contributing risk factors",
      "Recommended safeguards",
      "Privacy-enhancing capability fit",
      "Specialist review required",
      "Disclaimer",
    ]);
  });

  it("reports the same score, level, and rules version shown in the app", () => {
    expect(flatten()).toContain(`${result.score} out of 100`);
    expect(flatten()).toContain(result.level);
    expect(flatten()).toContain(result.guidance);
    expect(model.meta).toContainEqual({ label: "Scoring rules version", value: result.rulesVersion });
  });

  it("carries the use case, every answer, and every recommendation", () => {
    expect(flatten()).toContain(input.description);
    expect(flatten()).toContain("Email addresses, Health information");
    expect(flatten()).toContain("Research");
    result.recommendationDetails.forEach((item) => expect(flatten()).toContain(item.action));
    result.recommendationDetails.forEach((item) => {
      expect(flatten()).toContain(item.rationale);
      item.riskFactorIds.forEach((ruleId) => {
        expect(flatten()).toContain(result.factors.find((factor) => factor.ruleId === ruleId)?.label);
      });
    });
    result.factors.forEach((factor) => expect(flatten()).toContain(factor.label));
  });

  it("omits internal rule identifiers and categories", () => {
    result.factors.forEach((factor) => {
      expect(flatten()).not.toContain(factor.ruleId);
      expect(flatten()).not.toContain(`"${factor.category}"`);
    });
    expect(flatten()).not.toContain("schemaVersion");
  });

  it("states the decision-support disclaimer", () => {
    expect(flatten()).toContain(DISCLAIMER);
  });

  it("drops the conditional sections when they do not apply", () => {
    const lowRisk: AssessmentInput = {
      ...input,
      dataTypes: ["emails"],
      externalAccess: "no",
      rawExchange: "no",
      dataMovement: "no",
      combined: "no",
      secondaryUse: "no",
      purpose: "analytics",
    };
    const lowModel = buildReportModel(lowRisk, { ...result, limitations: [] });
    expect(lowModel.sections.map((section) => section.heading)).not.toContain("Specialist review required");
  });

  it("labels an unanswered question instead of leaving it blank", () => {
    const partial = buildReportModel({ ...input, combined: "" }, result);
    expect(JSON.stringify(partial)).toContain("Not answered");
  });
});

describe("pdf rendering", () => {
  it("does not download a report cancelled during generation", async () => {
    const pdfModule = await import("jspdf");
    const doc = new pdfModule.jsPDF();
    const save = vi.spyOn(doc, "save").mockReturnThis();
    vi.spyOn(pdfModule, "jsPDF").mockImplementation(function () { return doc; });
    const controller = new AbortController();
    const download = downloadAssessmentReport(input, result, controller.signal);
    controller.abort();
    await download;
    expect(save).not.toHaveBeenCalled();
  });

  it("produces a multi-page PDF that fits long content", async () => {
    const wordy: AssessmentInput = { ...input, description: "Merge partner records. ".repeat(60) };
    const doc = await renderAssessmentPdf(buildReportModel(wordy, result));
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(new Uint8Array(bytes).slice(0, 8))).toContain("%PDF-");
  });

  it("embeds the report title and no personal metadata", async () => {
    const doc = await renderAssessmentPdf(model);
    const raw = doc.output("datauristring");
    const pdf = Buffer.from(raw.split(",")[1], "base64").toString("latin1");
    expect(pdf).toContain("Data Governance Readiness Assessment");
    expect(pdf).not.toContain("/Author");
    expect(pdf).not.toContain("/Keywords");
  });
});
