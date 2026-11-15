import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * The browser only talks to this origin: fonts are self-hosted by next/font, and FastAPI and
 * Supabase are reached server-side through /api. Next.js inlines its hydration scripts, so
 * script-src needs 'unsafe-inline' unless every page renders dynamically with a nonce.
 * Development adds 'unsafe-eval' for React's error overlay and ws: for hot reload.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // The PDF parser runs in a worker; pdf.js falls back to a blob: worker in some browsers.
  "worker-src 'self' blob:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // Legacy equivalent of frame-ancestors 'none' for browsers without CSP Level 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  agentRules: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
