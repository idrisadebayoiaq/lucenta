import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/legal/terms", destination: "/terms", permanent: true },
      { source: "/legal/privacy", destination: "/privacy", permanent: true },
      { source: "/legal/acceptable-use", destination: "/responsible-use", permanent: true },
      { source: "/complete-profile", destination: "/onboarding", permanent: true },
      { source: "/dashboard/humanizer", destination: "/dashboard/rewriter", permanent: true },
      { source: "/developers", destination: "/freelancers?type=developer", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
