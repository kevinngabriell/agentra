import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The browser talks to the Agentra API directly, so connect-src must allow exactly that
// origin (instead of any https: host, which would let injected script exfiltrate tokens).
function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return "";
  }
}

// Document previews load a short-lived signed URL straight from object storage, so its origin
// must be allowed in img-src / frame-src. Set NEXT_PUBLIC_STORAGE_URL (comma-separated for several).
function storageOrigins(): string {
  const origins = (process.env.NEXT_PUBLIC_STORAGE_URL ?? "")
    .split(",")
    .map((u) => { try { return new URL(u.trim()).origin; } catch { return ""; } })
    .filter(Boolean);
  if (isDev) origins.push("http://localhost:*", "http://127.0.0.1:*");
  return origins.join(" ");
}

const csp = [
  "default-src 'self'",
  // React only needs eval in development (debug stack reconstruction); see Next's CSP guide.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storageOrigins()}`.trim(),
  `frame-src 'self' ${storageOrigins()}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin()} ${storageOrigins()}${isDev ? " ws: http://localhost:*" : ""}`.trim(),
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  async redirects() {
    return [
      // The commissions page used to live at the misspelled /agentra/commisions.
      { source: "/agentra/commisions", destination: "/agentra/commissions", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // No `preload`: that is a long-lived commitment for every subdomain and has to be
          // submitted to hstspreload.org deliberately, not switched on from app config.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
