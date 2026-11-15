// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig, { CONTENT_SECURITY_POLICY } from "../next.config";

describe("security headers", () => {
  it("applies the headers to every route", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
    expect(headers["Content-Security-Policy"]).toBe(CONTENT_SECURITY_POLICY);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("keeps the page out of frames and limits where it can load and send data", () => {
    const directives = new Map(CONTENT_SECURITY_POLICY.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }));
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("script-src")).not.toContain("'unsafe-eval'");
  });
});
