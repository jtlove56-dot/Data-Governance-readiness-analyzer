import { AssessmentInput, isAssessmentInput } from "./assessment";

/**
 * Session-scoped draft storage (SCRUM-16).
 *
 * v1.0 does not retain assessments. A draft lives only in this tab's
 * sessionStorage so an accidental refresh does not lose work; it is
 * cleared when the tab closes, after IDLE_TIMEOUT_MS of inactivity, or
 * when the person starts over. See docs/data-handling.md.
 */

export const DRAFT_KEY = "governance-assessment-draft-v2";
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// Earlier builds kept drafts in localStorage with no expiry.
const LEGACY_KEYS = ["governance-assessment-draft-v1"];

type StoredDraft = { savedAt: number; input: AssessmentInput };

function safely<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return fallback;
  }
}

export function purgeLegacyDrafts(storage?: Storage): void {
  safely(() => {
    const target = storage ?? window.localStorage;
    LEGACY_KEYS.forEach((key) => target.removeItem(key));
  }, undefined);
}

export function saveDraft(input: AssessmentInput, storage?: Storage, now = Date.now()): void {
  const draft: StoredDraft = { savedAt: now, input };
  safely(() => (storage ?? window.sessionStorage).setItem(DRAFT_KEY, JSON.stringify(draft)), undefined);
}

export function loadDraft(storage?: Storage, now = Date.now()): AssessmentInput | null {
  const raw = safely(() => (storage ?? window.sessionStorage).getItem(DRAFT_KEY), null);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as StoredDraft;
    if (!draft || !Number.isFinite(draft.savedAt) || draft.savedAt > now
      || now - draft.savedAt >= IDLE_TIMEOUT_MS || !isAssessmentInput(draft.input)) {
      clearDraft(storage);
      return null;
    }
    return draft.input;
  } catch {
    clearDraft(storage);
    return null;
  }
}

export function clearDraft(storage?: Storage): void {
  safely(() => (storage ?? window.sessionStorage).removeItem(DRAFT_KEY), undefined);
}
