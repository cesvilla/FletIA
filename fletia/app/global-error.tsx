'use client';

// Captura los errores de render no manejados del App Router y los manda a Sentry.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          background: '#0a0a0a',
          color: '#fafafa',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Algo salió mal</h2>
          <p style={{ opacity: 0.7, marginBottom: '1.25rem' }}>
            Ya fuimos notificados. Probá recargar la página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#eb4b15',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.4rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
