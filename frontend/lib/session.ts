import { AssessmentInput, EMPTY_INPUT } from "./assessment";

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

export function purgeLegacyDrafts(storage: Storage = window.localStorage): void {
  safely(() => LEGACY_KEYS.forEach((key) => storage.removeItem(key)), undefined);
}

export function saveDraft(input: AssessmentInput, storage: Storage = window.sessionStorage, now = Date.now()): void {
  const draft: StoredDraft = { savedAt: now, input };
  safely(() => storage.setItem(DRAFT_KEY, JSON.stringify(draft)), undefined);
}

export function loadDraft(storage: Storage = window.sessionStorage, now = Date.now()): AssessmentInput | null {
  const raw = safely(() => storage.getItem(DRAFT_KEY), null);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as StoredDraft;
    if (typeof draft.savedAt !== "number" || now - draft.savedAt > IDLE_TIMEOUT_MS) {
      clearDraft(storage);
      return null;
    }
    return { ...EMPTY_INPUT, ...draft.input };
  } catch {
    clearDraft(storage);
    return null;
  }
}

export function clearDraft(storage: Storage = window.sessionStorage): void {
  safely(() => storage.removeItem(DRAFT_KEY), undefined);
}
