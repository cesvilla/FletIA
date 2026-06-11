import type { Metadata } from 'next';
import './globals.css';
import SupportChat from './components/SupportChat';

export const metadata: Metadata = {
  metadataBase: new URL('https://flet-ia.vercel.app'),
  title: 'FletIA — Inteligencia para cada viaje de tu flota',
  description: 'Calculá el costo real de cada flete antes de salir: combustible, peajes, ruta, clima y tráfico. IA que aprende el consumo de cada camión y te dice si el viaje es rentable. Para transportistas y flotas argentinas.',
  openGraph: {
    title: 'FletIA — Inteligencia para cada viaje',
    description: 'Calculá el costo real de cada flete antes de salir. IA que aprende tu camión y te dice si el viaje es rentable. Probalo 15 días gratis, sin tarjeta.',
    url: 'https://flet-ia.vercel.app',
    siteName: 'FletIA',
    locale: 'es_AR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a1714" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <SupportChat />
      </body>
    </html>
  );
}
