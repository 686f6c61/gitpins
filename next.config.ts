import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      isDevelopment ? "'unsafe-eval'" : "",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
    ].filter(Boolean).join(" "),
    [
      "connect-src",
      "'self'",
      isDevelopment ? "ws: wss:" : "",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://www.googletagmanager.com",
      "https://*.ingest.sentry.io",
      "https://*.sentry.io",
    ].filter(Boolean).join(" "),
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://www.google-analytics.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
