import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssessmentWizard } from "../components/AssessmentWizard";
import { CAPABILITY_COPY, QUESTION_LABELS } from "../lib/assessment";

/**
 * Accessibility checks for the assessment flow (SCRUM-17).
 *
 * axe-core catches the machine-checkable WCAG failures. Colour contrast
 * cannot be judged in jsdom, so it is excluded here and audited against
 * the stylesheet instead; see docs/accessibility-review.md.
 */

const AXE_OPTIONS: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  rules: { "color-contrast": { enabled: false } },
};

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, AXE_OPTIONS);
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`,
  );
  expect(summary).toEqual([]);
}

function completeQuestions() {
  ["externalAccess", "rawExchange", "dataMovement", "combined", "secondaryUse"].forEach((key) => {
    const group = screen.getByRole("group", {
      name: new RegExp(QUESTION_LABELS[key as keyof typeof QUESTION_LABELS].slice(0, 24), "i"),
    });
    fireEvent.click(within(group).getByRole("button", { name: "Yes" }));
  });
}

function within(element: HTMLElement) {
  return {
    getByRole: (role: string, options: { name: string }) =>
      Array.from(element.querySelectorAll("button")).find(
        (node) => node.textContent?.trim() === options.name && role === "button",
      ) as HTMLElement,
  };
}

beforeEach(() => {
  window.sessionStorage.clear?.();
});

afterEach(cleanup);

describe("assessment flow accessibility", () => {
  it("has no axe violations on the description step", async () => {
    const { container } = render(<AssessmentWizard />);
    await expectNoViolations(container);
  });

  it("offers a skip link to the assessment", () => {
    render(<AssessmentWizard />);
    const skip = screen.getByRole("link", { name: /skip to the assessment/i });
    expect(skip.getAttribute("href")).toBe("#assessment");
    expect(document.querySelector("#assessment")).not.toBeNull();
  });

  it("announces the current step through a status region", () => {
    render(<AssessmentWizard />);
    expect(screen.getByRole("status").textContent).toContain("Step 1 of 4");
  });

  it("keeps every step reachable and accessible through the whole flow", async () => {
    const { container } = render(<AssessmentWizard />);

    fireEvent.change(screen.getByLabelText(/use-case description/i), {
      target: { value: "Share loyalty member emails with a partner brand for campaign measurement." },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: questions
    await screen.findByText(/how will the data be handled/i);
    await expectNoViolations(container);
    fireEvent.click(screen.getByRole("button", { name: /email addresses/i }));
    completeQuestions();
    fireEvent.click(screen.getByRole("button", { name: /assess risk/i }));

    // Step 3: score
    await screen.findByText(/what drives this score/i);
    await expectNoViolations(container);
    fireEvent.click(screen.getByRole("button", { name: /see recommendations/i }));

    // Step 4: recommendations
    await screen.findByText(/controls before approval/i);
    await expectNoViolations(container);
  });

  it("explains each recommended control in approved plain language", async () => {
    const { container } = render(<AssessmentWizard />);
    fireEvent.change(screen.getByLabelText(/use-case description/i), {
      target: { value: "Share loyalty member emails with a partner brand for campaign measurement." },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/how will the data be handled/i);
    fireEvent.click(screen.getByRole("button", { name: /email addresses/i }));
    completeQuestions();
    fireEvent.click(screen.getByRole("button", { name: /assess risk/i }));
    await screen.findByText(/what drives this score/i);
    fireEvent.click(screen.getByRole("button", { name: /see recommendations/i }));

    await waitFor(() => expect(container.querySelector(".capability-list")).not.toBeNull());
    const panel = container.querySelector(".capability-list") as HTMLElement;
    const labels = Array.from(panel.querySelectorAll("b")).map((node) => node.textContent ?? "");
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      expect(CAPABILITY_COPY[label]).toBeTruthy();
      expect(panel.textContent).toContain(CAPABILITY_COPY[label]);
    });
  });

  it("does not rely on colour alone to convey the risk level", async () => {
    render(<AssessmentWizard />);
    fireEvent.change(screen.getByLabelText(/use-case description/i), {
      target: { value: "Share patient records with an external analytics vendor for modelling." },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/how will the data be handled/i);
    fireEvent.click(screen.getByRole("button", { name: /health information/i }));
    completeQuestions();
    fireEvent.click(screen.getByRole("button", { name: /assess risk/i }));

    await screen.findByText(/what drives this score/i);
    expect(screen.getByText(/HIGH RISK/)).toBeTruthy();
  });
});
