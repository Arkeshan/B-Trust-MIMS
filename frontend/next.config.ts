import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.19.64.1"],
  async rewrites() {
    return [
      {
        // Intercept any frontend requests starting with /api/
        source: "/api/:path*",
        // Secretly route them to your Go backend
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;