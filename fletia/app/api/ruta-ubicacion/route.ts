import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — el CHOFER reporta su posición (público, identificado por el token).
// La página /ruta/[token] lo llama cada ~15s mientras el seguimiento está activo.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { token, lat, lon, activo } = body as { token?: string; lat?: number; lon?: number; activo?: boolean };

  if (!token) return NextResponse.json({ error: 'Falta el token' }, { status: 400 });

  const admin = createAdminClient();

  // Validar que la ruta exista, esté activa y no vencida (sin exponer el user_id).
  const { data: ruta } = await admin
    .from('rutas_compartidas')
    .select('token, estado, expira_en')
    .eq('token', token)
    .maybeSingle();

  if (!ruta) return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 });
  const vencida = new Date(ruta.expira_en).getTime() < Date.now();
  if (ruta.estado !== 'activa' || vencida) {
    return NextResponse.json({ error: 'La ruta ya no está activa' }, { status: 410 });
  }

  // Detener el seguimiento: solo baja el flag, conserva la última posición.
  if (activo === false) {
    await admin.from('rutas_compartidas').update({ tracking_activo: false }).eq('token', token);
    return NextResponse.json({ ok: true });
  }

  // Reporte de posición: requiere coordenadas válidas.
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Coordenadas fuera de rango' }, { status: 400 });
  }

  const { error } = await admin
    .from('rutas_compartidas')
    .update({
      chofer_lat: lat,
      chofer_lon: lon,
      chofer_ubicacion_at: new Date().toISOString(),
      tracking_activo: true,
    })
    .eq('token', token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET — el DUEÑO (autenticado) consulta la última posición del chofer de SU ruta.
// Devuelve también el snapshot para dibujar el mapa con la ruta + el punto en vivo.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Falta el token' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('rutas_compartidas')
    .select('chofer_lat, chofer_lon, chofer_ubicacion_at, tracking_activo, estado, expira_en, snapshot, user_id')
    .eq('token', token)
    .eq('user_id', user.id) // solo el dueño ve la ubicación de su chofer
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 });

  return NextResponse.json({
    tracking_activo: data.tracking_activo === true,
    lat: data.chofer_lat ?? null,
    lon: data.chofer_lon ?? null,
    ubicacion_at: data.chofer_ubicacion_at ?? null,
    snapshot: {
      polyline: data.snapshot?.polyline ?? [],
      origen: data.snapshot?.origen ?? null,
      destino: data.snapshot?.destino ?? null,
      km: data.snapshot?.km ?? 0,
    },
  });
}
