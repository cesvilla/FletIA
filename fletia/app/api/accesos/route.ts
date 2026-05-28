import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST — llamado al registrarse, crea el acceso pendiente
export async function POST(request: Request) {
  try {
    const { user_id, email, empresa } = await request.json();
    if (!user_id || !email) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const admin = createAdminClient();

    // Verificar que el usuario existe en auth
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(user_id);
    if (authErr || !authUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // Insertar acceso pendiente solo si no existe — nunca sobreescribir uno aprobado
    const { error } = await admin.from('accesos').upsert({
      user_id,
      email,
      empresa: empresa || '',
      aprobado: false,
    }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — llamado por el middleware para verificar estado del acceso
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('accesos')
      .select('aprobado, fecha_expiracion, empresa')
      .eq('user_id', user_id)
      .single();

    if (error || !data) return NextResponse.json({ estado: 'pendiente' });

    if (!data.aprobado) return NextResponse.json({ estado: 'pendiente' });

    if (data.fecha_expiracion && new Date(data.fecha_expiracion) < new Date()) {
      return NextResponse.json({ estado: 'vencido' });
    }

    return NextResponse.json({ estado: 'activo', fecha_expiracion: data.fecha_expiracion });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
