import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import example from "../../shared/assessment-example.json";
import { Answers, dataTypes, steps, toRequest, validateStep } from "../lib/questionnaire";
import { Questionnaire } from "./questionnaire";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function clickButton(name: string) { fireEvent.click(screen.getByRole("button", { name })); }

function fillStep(index: number, answers = example) {
  if (index === 0) for (const value of answers.data_types) {
    const type = dataTypes.find((item) => item.value === value)!;
    fireEvent.click(screen.getByRole("checkbox", { name: `${type.label} ${type.example}` }));
  }
  for (const q of steps[index].questions) {
    if (q.show && !q.show(answers as Answers)) continue;
    if (q.type === "text") fireEvent.change(screen.getByRole("textbox", { name: q.label }), { target: { value: answers[q.key] } });
    else fireEvent.click(document.querySelector(`input[name="${q.key}"][value="${answers[q.key]}"]`)!);
  }
}

function reachReview() {
  render(<Questionnaire />);
  for (let step = 0; step < 4; step++) {
    fillStep(step);
    clickButton(step === 3 ? "Review answers" : "Continue");
  }
}

describe("Questionnaire", () => {
  it("blocks empty steps and requires details when Other is selected", () => {
    render(<Questionnaire />);
    clickButton("Continue");
    expect(screen.getByRole("alert")).toHaveTextContent("Select at least one data type");
    fireEvent.click(screen.getByRole("checkbox", { name: /Other data/ }));
    clickButton("Continue");
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("heading", { name: "What data is involved?" })).toBeInTheDocument();
  });

  it("keeps multiple selections and text when navigating back", () => {
    render(<Questionnaire />);
    fillStep(0);
    clickButton("Continue");
    fillStep(1);
    clickButton("Back");
    expect(screen.getByRole("checkbox", { name: /^Names / })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^Email addresses / })).toBeChecked();
    expect(screen.getByRole("textbox")).toHaveValue(example.other_data_types);
    clickButton("Continue");
    expect(screen.getByRole("textbox", { name: "Which people are involved or affected?" })).toHaveValue(example.people);
  });

  it("cannot jump to review after clearing a previously completed required answer", () => {
    reachReview();
    clickButton("Edit participants");
    fireEvent.change(screen.getByRole("textbox", { name: "Which people are involved or affected?" }), { target: { value: "   " } });
    clickButton("5 Review");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Who is involved?" })).toBeInTheDocument();
  });

  it("submits the exact shared backend contract to the configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "validated", submission_id: "test-reference" }) });
    vi.stubGlobal("fetch", fetchMock);
    reachReview();
    clickButton("Submit questionnaire");
    await screen.findByText("Your answers passed validation.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/assessments");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(example);
    clickButton("Review answers");
    expect(screen.getByText(example.people)).toBeInTheDocument();
  });

  it("keeps answers after a failed request and supports retry", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "validated", submission_id: "retry-reference" }) });
    vi.stubGlobal("fetch", fetchMock);
    reachReview();
    clickButton("Submit questionnaire");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your answers are still here"));
    expect(screen.getByText(example.purpose)).toBeInTheDocument();
    clickButton("Submit questionnaire");
    await screen.findByText("Your answers passed validation.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("requires conditional details and omits inactive details from submission", () => {
    const answers = { ...example, secondary_use_details: " " } as Answers;
    expect(validateStep(answers, 3)).toHaveProperty("secondary_use_details");
    const changed = { ...example, external_access: "no", secondary_use: "unsure", reidentification: "no", data_types: ["email"] } as Answers;
    const request = toRequest(changed);
    expect(request.other_data_types).toBe("");
    expect(request.external_access_details).toBe("");
    expect(request.secondary_use_details).toBe("");
    expect(request.reidentification_details).toBe("");
    expect(changed.secondary_use_details).toBe(example.secondary_use_details);
    expect(validateStep(changed, 3)).toEqual({});
  });
});
