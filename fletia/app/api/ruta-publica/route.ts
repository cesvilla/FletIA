import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/ruta-publica?token=xxx — lectura pública del snapshot de una ruta.
// No expone datos del dueño ni de costos: solo lo operativo para el chofer.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Falta el token' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('rutas_compartidas')
    .select('chofer_nombre, owner_whatsapp, snapshot, estado, expira_en')
    .eq('token', token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Error al cargar la ruta' }, { status: 500 });
  if (!data) return NextResponse.json({ estado: 'inexistente' }, { status: 404 });

  const vencida = new Date(data.expira_en).getTime() < Date.now();
  if (data.estado !== 'activa' || vencida) {
    return NextResponse.json({ estado: data.estado === 'activa' ? 'vencida' : data.estado });
  }

  // Snapshot ya tiene todo: mapa, peajes, clima, tráfico. No llamamos APIs externas.
  return NextResponse.json({
    estado: 'activa',
    chofer_nombre: data.chofer_nombre,
    owner_whatsapp: data.owner_whatsapp,
    snapshot: data.snapshot,
  });
}
