import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
