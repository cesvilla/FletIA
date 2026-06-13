import type { Metadata } from 'next';
import { Barlow_Condensed, DM_Mono, Inter } from 'next/font/google';
import LandingV2 from './LandingV2';

const display = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700', '800', '900'], variable: '--f-display', display: 'swap' });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-mono', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--f-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'FletIA — Logística inteligente para tu flota',
  description: 'Calculá el costo real de cada flete antes de salir, con IA que aprende tu camión. Experiencia inmersiva en 3D. Probalo 15 días gratis, sin tarjeta.',
};

export default function V2Page() {
  return (
    <div className={`${display.variable} ${mono.variable} ${body.variable}`}>
      <LandingV2 />
    </div>
  );
}
