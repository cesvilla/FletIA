import type { Metadata } from 'next';
import './globals.css';
import WhatsAppButton from './components/WhatsAppButton';

export const metadata: Metadata = {
  title: 'FletIA — Combustible inteligente para tu flota',
  description: 'Calculá el costo exacto de combustible de cada viaje según peso, ruta y terreno. IA para empresas de logística argentinas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
