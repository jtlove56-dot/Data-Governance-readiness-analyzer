import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: true,
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
