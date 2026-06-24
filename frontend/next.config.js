/** @type {import('next').NextConfig} */

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_ROOT ? `${process.env.NEXT_PUBLIC_API_ROOT}/api/v1` : "");

// Only enforce HTTPS during the actual production build phase, so `next lint`
// and `next dev` are not affected.
const isProdBuild = process.env.NEXT_PHASE === "phase-production-build";
if (isProdBuild && apiUrl && !apiUrl.startsWith("https://")) {
  throw new Error(
    `Refusing to build: NEXT_PUBLIC_API_URL must use https:// in production (got "${apiUrl}").`
  );
}

const apiConnectSrc = (() => {
  try {
    if (!apiUrl) return "";
    const u = new URL(apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
})();

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self'${apiConnectSrc ? ` ${apiConnectSrc}` : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const noindexHeader = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/login", headers: noindexHeader },
      { source: "/register", headers: noindexHeader },
      { source: "/dashboard/:path*", headers: noindexHeader },
      { source: "/advisor/:path*", headers: noindexHeader },
      { source: "/checkout/:path*", headers: noindexHeader },
      { source: "/testing/:path*", headers: noindexHeader },
      { source: "/admin/:path*", headers: noindexHeader },
    ];
  },
};

module.exports = nextConfig;
