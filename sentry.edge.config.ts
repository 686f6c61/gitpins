/**
 * Sentry/GlitchTip - configuracion del runtime edge de Next.js.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || 'gitpins',
    tracesSampleRate: 0.01,
  });
}
