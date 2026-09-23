"use client";

import { useEffect, useMemo, useState } from "react";

type HealthResponse = {
  service: string;
  status: string;
  environment: string;
  version: string;
};

type RequestState =
  | { kind: "loading" }
  | { kind: "ready"; data: HealthResponse }
  | { kind: "error"; message: string };

export function BackendStatus() {
  const [state, setState] = useState<RequestState>({ kind: "loading" });
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Health check returned ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        setState({ kind: "ready", data });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Backend health unavailable";
        setState({ kind: "error", message });
      }
    }

    void loadHealth();

    return () => controller.abort();
  }, [apiBaseUrl]);

  return (
    <aside className="w-full rounded-md border border-[var(--line)] bg-[#f0faf8] p-5 shadow-sm md:max-w-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold">Backend status</h2>
        <span
          className="h-3 w-3 rounded-full bg-[var(--accent)]"
          aria-hidden="true"
        />
      </div>

      {state.kind === "loading" && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Checking API health...
        </p>
      )}

      {state.kind === "error" && (
        <p className="mt-4 text-sm leading-6 text-red-700">{state.message}</p>
      )}

      {state.kind === "ready" && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-[var(--muted)]">Service</dt>
          <dd className="font-semibold">{state.data.service}</dd>
          <dt className="text-[var(--muted)]">Status</dt>
          <dd className="font-semibold">{state.data.status}</dd>
          <dt className="text-[var(--muted)]">Environment</dt>
          <dd className="font-semibold">{state.data.environment}</dd>
          <dt className="text-[var(--muted)]">Version</dt>
          <dd className="font-semibold">{state.data.version}</dd>
        </dl>
      )}
    </aside>
  );
}
