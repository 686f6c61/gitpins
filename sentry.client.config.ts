/**
 * Sentry/GlitchTip - configuracion del cliente (browser).
 */
import * as Sentry from '@sentry/nextjs';

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'gitpins',
    tracesSampleRate: 0.01,
  });
}
