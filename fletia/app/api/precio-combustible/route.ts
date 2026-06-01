import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreciosDeHoy } from '@/lib/precios';

// Permitir hasta 15s: la primera consulta del día va a la API oficial.
export const maxDuration = 15;
// Siempre dinámico: refleja el precio del día, no se cachea en build.
export const dynamic = 'force-dynamic';

// Devuelve los precios de gasoil de hoy (promedio nacional, Sec. de Energía),
// cacheados por día en Supabase. Ver lib/precios.ts para la estrategia.
export async function GET() {
  try {
    const admin = createAdminClient();
    const { precios, fuente } = await getPreciosDeHoy(admin);
    return NextResponse.json({ precios, fuente });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
