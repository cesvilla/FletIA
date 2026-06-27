// Configuración de Sentry para el runtime Edge (middleware).
// Se importa desde instrumentation.ts.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://f37c07cad94cf104518fce7847f275f8@o4511634933743616.ingest.us.sentry.io/4511638978822144',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
