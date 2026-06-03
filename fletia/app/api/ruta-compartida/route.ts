import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flet-ia.vercel.app';
const HORAS_VALIDEZ = 24;

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

// POST — crear un link de ruta para un chofer
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { chofer_nombre, chofer_celular, owner_whatsapp, snapshot } = body;

  if (!chofer_nombre?.trim()) return NextResponse.json({ error: 'Ingresá el nombre del chofer' }, { status: 400 });
  if (!snapshot?.polyline?.length) return NextResponse.json({ error: 'Primero calculá una ruta para compartir' }, { status: 400 });

  const token = randomBytes(16).toString('hex'); // 32 chars, no adivinable
  const expira = new Date();
  expira.setHours(expira.getHours() + HORAS_VALIDEZ);

  const admin = createAdminClient();
  const { error } = await admin.from('rutas_compartidas').insert({
    token,
    user_id: user.id,
    chofer_nombre: chofer_nombre.trim(),
    chofer_celular: (chofer_celular || '').trim() || null,
    owner_whatsapp: (owner_whatsapp || '').trim() || null,
    snapshot,
    estado: 'activa',
    expira_en: expira.toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recordar el WhatsApp del dueño para la próxima vez
  if (owner_whatsapp?.trim()) {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), whatsapp: owner_whatsapp.trim() },
    }).catch(() => {});
  }

  return NextResponse.json({ token, url: `${SITE_URL}/ruta/${token}`, expira_en: expira.toISOString() });
}

// GET — listar las rutas compartidas del dueño (activas primero)
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('rutas_compartidas')
    .select('token, chofer_nombre, chofer_celular, estado, created_at, expira_en, snapshot')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ahora = Date.now();
  const rutas = (data || []).map((r: any) => ({
    token: r.token,
    chofer_nombre: r.chofer_nombre,
    chofer_celular: r.chofer_celular,
    estado: r.estado,
    vencida: new Date(r.expira_en).getTime() < ahora,
    created_at: r.created_at,
    expira_en: r.expira_en,
    origen: r.snapshot?.origen?.nombre || '',
    destino: r.snapshot?.destino?.nombre || '',
    km: r.snapshot?.km || 0,
  }));

  return NextResponse.json({ rutas });
}

// PATCH — cerrar una ruta (marcarla finalizada)
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: 'Falta el token' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('rutas_compartidas')
    .update({ estado: 'finalizada' })
    .eq('token', token)
    .eq('user_id', user.id); // solo el dueño puede cerrar la suya

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
