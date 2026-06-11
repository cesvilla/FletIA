import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEVICE_COOKIE } from '@/lib/deviceLock';
import { randomUUID } from 'crypto';

/**
 * POST /api/accesos/claim
 *
 * Se llama justo después de un login exitoso. Modelo "última sesión gana":
 * este dispositivo queda como el dueño de la cuenta y cualquier sesión anterior
 * se desplaza (se cierra sola en su próxima navegación). Así un mismo cliente
 * pasa libremente de la PC al teléfono, pero dos personas no pueden usar la
 * cuenta a la vez (la que entra desconecta a la otra).
 *
 * Seguridad: el usuario se toma de la sesión autenticada (cookies), NUNCA del
 * body. Así nadie puede manipular el candado de una cuenta ajena.
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // El admin (dueño de FletIA) nunca queda atado a un solo dispositivo.
    const ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    if (user.email === ADMIN) return NextResponse.json({ ok: true, admin: true });

    // Reclamamos este dispositivo como la sesión vigente.
    const token = randomUUID();
    const admin = createAdminClient();
    const { error } = await admin
      .from('accesos')
      .update({ device_token: token })
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
