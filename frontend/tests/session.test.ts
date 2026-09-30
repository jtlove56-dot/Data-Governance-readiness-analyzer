import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_INPUT } from "../lib/assessment";
import { DRAFT_KEY, IDLE_TIMEOUT_MS, clearDraft, loadDraft, purgeLegacyDrafts, saveDraft } from "../lib/session";

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.get(key) ?? null; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, value); }
}

const draft = { ...EMPTY_INPUT, description: "Share loyalty member emails with a partner brand." };
let session: MemoryStorage;
let local: MemoryStorage;

beforeEach(() => {
  session = new MemoryStorage();
  local = new MemoryStorage();
});

afterEach(() => vi.restoreAllMocks());

describe("session-scoped draft storage", () => {
  it("round-trips a draft within the session", () => {
    saveDraft(draft, session);
    expect(session.getItem(DRAFT_KEY)).toContain("loyalty");
    expect(loadDraft(session)).toEqual(draft);
  });

  it("discards a draft after the idle timeout", () => {
    saveDraft(draft, session, 0);
    expect(loadDraft(session, IDLE_TIMEOUT_MS - 1)).toEqual(draft);
    expect(loadDraft(session, IDLE_TIMEOUT_MS)).toBeNull();
    expect(session.getItem(DRAFT_KEY)).toBeNull();
  });

  it("clears the draft on start over", () => {
    saveDraft(draft, session);
    clearDraft(session);
    expect(loadDraft(session)).toBeNull();
  });

  it("removes drafts left in localStorage by earlier builds", () => {
    local.setItem("governance-assessment-draft-v1", JSON.stringify(draft));
    purgeLegacyDrafts(local);
    expect(local.length).toBe(0);
  });

  it("drops corrupted drafts instead of throwing", () => {
    session.setItem(DRAFT_KEY, "{not json");
    expect(loadDraft(session)).toBeNull();
    expect(session.getItem(DRAFT_KEY)).toBeNull();
  });

  it("keeps working when storage is blocked", () => {
    const blocked = new MemoryStorage();
    blocked.setItem = () => { throw new DOMException("blocked", "SecurityError"); };
    expect(() => saveDraft(draft, blocked)).not.toThrow();
  });

  it.each([null, {}, { ...draft, dataTypes: null }, { ...draft, description: 42 }, { ...draft, purpose: "unknown" }])(
    "discards an invalid draft: %j", (input) => {
      session.setItem(DRAFT_KEY, JSON.stringify({ savedAt: 100, input }));
      expect(loadDraft(session, 100)).toBeNull();
      expect(session.getItem(DRAFT_KEY)).toBeNull();
    },
  );

  it("discards timestamps in the future", () => {
    saveDraft(draft, session, 101);
    expect(loadDraft(session, 100)).toBeNull();
  });

  it("handles browser storage getters throwing before storage access", () => {
    const blocked = () => { throw new DOMException("blocked", "SecurityError"); };
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(blocked);
    vi.spyOn(window, "localStorage", "get").mockImplementation(blocked);
    expect(() => saveDraft(draft)).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
    expect(() => purgeLegacyDrafts()).not.toThrow();
    expect(loadDraft()).toBeNull();
  });
});
