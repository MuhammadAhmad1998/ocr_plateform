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
  // Only upgrade to HTTPS in production — breaks LAN dev over http://192.168.x.x:3000
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS over plain HTTP dev (and LAN IPs) blocks assets after first visit
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // CORP same-origin blocks cross-host dev (e.g. phone loading from LAN IP)
  ...(isDev
    ? []
    : [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ]),
];

const noindexHeader = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// LAN dev access (e.g. Mac on same network) — Next.js blocks /_next/* without this
const allowedDevOrigins = (() => {
  const fromEnv =
    process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  try {
    const { hostname } = new URL(apiUrl);
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      // Next may match host with or without port (see dev-server cross-origin guard)
      const lanPatterns = ["192.168.*", "10.*"];
      return [hostname, `${hostname}:3000`, ...lanPatterns, ...fromEnv];
    }
  } catch {
    /* ignore */
  }
  return fromEnv.length > 0 ? fromEnv : ["192.168.18.6", "192.168.18.6:3000", "192.168.*"];
})();

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins,
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
