/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a todas las rutas.
// CSP pensada para NO romper mapas (Leaflet/OSM), rutas (ORS/OSRM/TomTom),
// clima (Open-Meteo), Supabase, MercadoPago ni la geolocalizacion del chofer.
const securityHeaders = [
  // Evita clickjacking: el sitio no puede embeberse en un iframe ajeno.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Evita MIME-sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No filtrar la URL completa como referer a terceros.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Solo el propio sitio puede usar geolocalizacion (la necesita el chofer en /ruta).
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(self)' },
  // Refuerza HTTPS (Vercel ya la envia; redundante pero inofensivo).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inyecta scripts inline/eval; MercadoPago SDK desde su dominio.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.mercadopago.com",
      // Leaflet y estilos inyectados requieren 'unsafe-inline'.
      "style-src 'self' 'unsafe-inline'",
      // Tiles de mapas y avatares pueden venir de cualquier https (OSM, etc.).
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Llamadas a Supabase y APIs externas (rutas, clima, trafico) via https/wss.
      "connect-src 'self' https: wss:",
      // MercadoPago abre checkout en iframe.
      "frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com",
      // Nadie puede embeber FletIA (equivale a X-Frame-Options: DENY).
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  org: 'fletia',
  project: 'fletia',
  // Silenciar logs del plugin salvo en CI.
  silent: !process.env.CI,
  // Sube source maps del cliente para stack traces legibles (requiere SENTRY_AUTH_TOKEN en build).
  widenClientFileUpload: true,
  // Saca el SDK de logs de consola de Sentry del bundle de prod.
  disableLogger: true,
});
