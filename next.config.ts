import type { NextConfig } from "next";

/** FastAPI base (no trailing slash). Proxied so the browser can use same-origin `/api`. */
const backendOrigin =
  process.env.BACKEND_ORIGIN ||
  (process.env.NEXT_PUBLIC_API_URL || "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/$/, "") ||
  "http://127.0.0.1:5000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
