import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { leerDeviceToken, dispositivoActivo } from '@/lib/deviceLock';

// POST — llamado al registrarse, crea el acceso pendiente
export async function POST(request: Request) {
  try {
    const { user_id, email, empresa } = await request.json();
    if (!user_id || !email) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const admin = createAdminClient();

    // Verificar que el usuario existe en auth
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(user_id);
    if (authErr || !authUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // Verificar si ya existe un acceso para este usuario
    const { data: existing } = await admin
      .from('accesos')
      .select('id, aprobado')
      .eq('user_id', user_id)
      .single();

    // Solo insertar si no existe — nunca sobreescribir uno aprobado
    if (!existing) {
      const { error } = await admin.from('accesos').insert({
        user_id,
        email,
        empresa: empresa || '',
        aprobado: false,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
      .select('aprobado, fecha_expiracion, empresa, device_token, device_seen_at')
      .eq('user_id', user_id)
      .single();

    if (error || !data) return NextResponse.json({ estado: 'pendiente' });

    if (!data.aprobado) return NextResponse.json({ estado: 'pendiente' });

    if (data.fecha_expiracion && new Date(data.fecha_expiracion) < new Date()) {
      return NextResponse.json({ estado: 'vencido' });
    }

    // Candado de un solo dispositivo.
    if (data.device_token) {
      const incoming = leerDeviceToken(request.headers.get('cookie'));
      if (incoming === data.device_token) {
        // Es el dispositivo dueño → refrescamos su "última actividad" (heartbeat),
        // como mucho una vez por minuto para no escribir en cada navegación.
        const cutoff = new Date(Date.now() - 60_000).toISOString();
        await admin
          .from('accesos')
          .update({ device_seen_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .lt('device_seen_at', cutoff);
      } else if (dispositivoActivo(data.device_seen_at)) {
        // Otro token Y el dueño sigue activo → esta sesión sobra: la expulsamos.
        return NextResponse.json({ estado: 'otro_dispositivo' });
      }
      // Otro token pero el dueño está inactivo → lo dejamos seguir; en su próximo
      // login podrá reclamar el candado (no trabamos a un único usuario que volvió).
    }

    return NextResponse.json({ estado: 'activo', fecha_expiracion: data.fecha_expiracion });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
