import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreciosDeHoy } from '@/lib/precios';

// Hasta 30s: si la caché del día está vacía, baja el CSV oficial (~9 MB) y calcula.
export const maxDuration = 30;
// Siempre dinámico: refleja el precio del día, no se cachea en build.
export const dynamic = 'force-dynamic';

// Devuelve los precios de gasoil de hoy para la provincia (?provincia=),
// cacheados por día en Supabase. Ver lib/precios.ts para la estrategia.
export async function GET(req: NextRequest) {
  try {
    const provincia = req.nextUrl.searchParams.get('provincia') || undefined;
    const admin = createAdminClient();
    const { precios, fuente, provincia: prov } = await getPreciosDeHoy(admin, provincia);
    return NextResponse.json({ precios, fuente, provincia: prov });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
