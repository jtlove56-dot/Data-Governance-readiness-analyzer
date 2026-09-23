import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackendStatus } from "./backend-status";

describe("BackendStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the backend health response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          service: "karlsgate-api",
          status: "ok",
          environment: "test",
          version: "0.1.0",
        }),
      }),
    );

    render(React.createElement(BackendStatus));

    await waitFor(() => {
      expect(screen.getByText("karlsgate-api")).toBeInTheDocument();
    });

    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
  });
});
