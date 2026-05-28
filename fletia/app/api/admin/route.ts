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

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const admin = createAdminClient();

  // Obtener todos los usuarios de auth (sin depender de grants en accesos)
  const { data: authData, error: authError } = await admin.auth.admin.listUsers();
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Filtrar el admin
  const users = (authData.users || []).filter(u => u.email !== ADMIN_EMAIL);

  // Obtener accesos existentes
  const { data: accesosData } = await admin.from('accesos').select('*');
  const accesosMap = new Map((accesosData || []).map((a: any) => [a.user_id, a]));

  // Combinar: si no tiene acceso en tabla, aparece como pendiente
  const accesos = users.map(u => {
    const acceso = accesosMap.get(u.id);
    return acceso ?? {
      id: u.id,
      user_id: u.id,
      email: u.email,
      empresa: u.user_metadata?.empresa || '',
      aprobado: false,
      tipo: 'demo',
      dias_demo: 15,
      fecha_aprobacion: null,
      fecha_expiracion: null,
      created_at: u.created_at,
    };
  });

  // Ordenar por fecha de creación descendente
  accesos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ accesos });
}

// POST — aprobar usuario con días de demo
export async function POST(request: Request) {
  const admin_user = await verificarAdmin();
  if (!admin_user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { user_id, dias, tipo } = await request.json();
  if (!user_id || !dias) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const fecha_expiracion = new Date();
  fecha_expiracion.setDate(fecha_expiracion.getDate() + Number(dias));

  // Obtener email del usuario desde auth para el upsert
  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(user_id);
  const email = authUser?.user?.email || '';
  const empresa = authUser?.user?.user_metadata?.empresa || '';

  // Upsert: crea la fila si no existe, actualiza si ya existe
  const { error } = await admin
    .from('accesos')
    .upsert({
      user_id,
      email,
      empresa,
      aprobado: true,
      dias_demo: Number(dias),
      tipo: tipo || 'demo',
      fecha_aprobacion: new Date().toISOString(),
      fecha_expiracion: fecha_expiracion.toISOString(),
    }, { onConflict: 'user_id' });

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
