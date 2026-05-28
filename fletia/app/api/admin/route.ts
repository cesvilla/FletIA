import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function verificarAdmin() {
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL ? user : null;
}

// GET — listar todos los accesos
export async function GET() {
  const admin_user = await verificarAdmin();
  if (!admin_user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('accesos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accesos: data });
}

// POST — aprobar usuario con días de demo
export async function POST(request: Request) {
  const admin_user = await verificarAdmin();
  if (!admin_user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { user_id, dias, tipo } = await request.json();
  if (!user_id || !dias) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const fecha_expiracion = new Date();
  fecha_expiracion.setDate(fecha_expiracion.getDate() + Number(dias));

  const admin = createAdminClient();
  const { error } = await admin
    .from('accesos')
    .update({
      aprobado: true,
      dias_demo: Number(dias),
      tipo: tipo || 'demo',
      fecha_aprobacion: new Date().toISOString(),
      fecha_expiracion: fecha_expiracion.toISOString(),
    })
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, fecha_expiracion });
}

// DELETE — revocar acceso
export async function DELETE(request: Request) {
  const admin_user = await verificarAdmin();
  if (!admin_user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { user_id } = await request.json();
  const admin = createAdminClient();
  const { error } = await admin
    .from('accesos')
    .update({ aprobado: false, fecha_expiracion: null })
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
