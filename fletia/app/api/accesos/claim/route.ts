import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEVICE_COOKIE, leerDeviceToken, dispositivoActivo } from '@/lib/deviceLock';
import { randomUUID } from 'crypto';

/**
 * POST /api/accesos/claim
 *
 * Se llama justo después de un login exitoso. Hace cumplir "un solo dispositivo
 * por cuenta": si la cuenta YA está activa en otro dispositivo, este login se
 * RECHAZA (status 409). Si está libre, reclama el dispositivo actual.
 *
 * Seguridad: el usuario se toma de la sesión autenticada (cookies), NUNCA del
 * body. Así nadie puede manipular el candado de una cuenta ajena.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // El admin (dueño de FletIA) nunca queda atado a un solo dispositivo.
    const ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    if (user.email === ADMIN) return NextResponse.json({ ok: true, admin: true });

    const admin = createAdminClient();
    const { data: acc } = await admin
      .from('accesos')
      .select('device_token, device_seen_at')
      .eq('user_id', user.id)
      .single();

    const incoming = leerDeviceToken(request.headers.get('cookie'));

    // ¿Hay OTRO dispositivo distinto y todavía activo? → no dejamos entrar acá.
    if (
      acc?.device_token &&
      acc.device_token !== incoming &&
      dispositivoActivo(acc.device_seen_at)
    ) {
      return NextResponse.json({ blocked: true }, { status: 409 });
    }

    // Libre (o es el mismo dispositivo, o el dueño quedó inactivo): reclamamos.
    const token = randomUUID();
    const { error } = await admin
      .from('accesos')
      .update({ device_token: token, device_seen_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Cookie httpOnly: el JS de la página no puede leerla ni falsificarla.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 año
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
