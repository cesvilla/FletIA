// Configuración de Sentry para el runtime Node.js (API routes, cron, server components).
// Se importa desde instrumentation.ts.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://f37c07cad94cf104518fce7847f275f8@o4511634933743616.ingest.us.sentry.io/4511638978822144',
  // Solo reporta en producción: en dev no ensucia el panel ni gasta cuota.
  enabled: process.env.NODE_ENV === 'production',
  // 10% de las transacciones para performance (cuota free es chica).
  tracesSampleRate: 0.1,
  // No mandes PII por defecto (mails de clientes, etc.).
  sendDefaultPii: false,
});
