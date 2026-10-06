import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ?? (isGitHubPages ? "/lugarnenhum" : "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  basePath,
};

export default nextConfig;
