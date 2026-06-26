import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreciosDeHoy } from '@/lib/precios';

// Permitir hasta 15s: la primera consulta del día scrapea la fuente viva.
export const maxDuration = 15;
// Siempre dinámico: refleja el precio del día, no se cachea en build.
export const dynamic = 'force-dynamic';

// Devuelve los precios de gasoil de hoy ajustados a la provincia (?provincia=),
// cacheados por día en Supabase. Ver lib/precios.ts para la estrategia.
export async function GET(req: NextRequest) {
  try {
    const provincia = req.nextUrl.searchParams.get('provincia') || undefined;
    const admin = createAdminClient();
    const { precios, fuente, provincia: prov, factor } = await getPreciosDeHoy(admin, provincia);
    return NextResponse.json({ precios, fuente, provincia: prov, factor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
