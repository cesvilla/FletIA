import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkApis } from '@/lib/health';
import { estadoActualizacionPeajes } from '@/lib/peajes-ar';

// Pinguea servicios externos → puede tardar. Siempre dinámico.
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Solo el owner puede consultar el estado (las pruebas consumen cuota de ORS/TomTom).
async function esAdmin(): Promise<boolean> {
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && user.email === ADMIN_EMAIL;
}

export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const salud = await checkApis();
  const peajes = estadoActualizacionPeajes();
  return NextResponse.json(
    { ...salud, peajes },
    { status: salud.hayCriticoCaido ? 503 : 200 },
  );
}
