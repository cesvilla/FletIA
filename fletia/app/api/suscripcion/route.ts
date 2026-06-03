import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { montoMensual, conceptoSuscripcion, planParaCamiones } from '@/lib/planes';
import { PreApproval } from 'mercadopago';

// Permitir hasta 15s: la request a MercadoPago puede tardar.
export const maxDuration = 15;

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

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

// POST — Crear suscripción en MercadoPago para el usuario logueado.
// Devuelve { init_point } para redirigir al checkout de MP.
export async function POST() {
  if (!MP_TOKEN) {
    return NextResponse.json(
      { error: 'MercadoPago no configurado. Contactá al administrador.' },
      { status: 503 },
    );
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Obtener datos del acceso del usuario (camiones autorizados, empresa)
  const admin = createAdminClient();
  const { data: acceso } = await admin
    .from('accesos')
    .select('empresa, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const empresa = acceso?.empresa || user.user_metadata?.empresa || 'Cliente';
  const limiteCamiones = Number(user.user_metadata?.limite_camiones ?? 1);
  const monto = montoMensual(limiteCamiones);
  const concepto = conceptoSuscripcion(empresa, limiteCamiones);
  const plan = planParaCamiones(limiteCamiones);

  if (monto <= 0) {
    return NextResponse.json({ error: 'El plan de prueba es gratuito, no requiere suscripción.' }, { status: 400 });
  }

  try {
    const preApproval = new PreApproval({
      accessToken: MP_TOKEN,
    });

    const body = {
      reason: concepto,
      external_reference: user.id,
      payer_email: user.email!,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months' as const,
        transaction_amount: monto,
        currency_id: 'ARS',
      },
      back_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flet-ia.vercel.app'}/dashboard`,
      status: 'pending' as const,
    };

    const result = await preApproval.create({ body });

    // Guardar el id de la suscripción en accesos para trackear
    if (result.id) {
      await admin
        .from('accesos')
        .update({ mp_preapproval_id: result.id })
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      init_point: result.init_point,
      preapproval_id: result.id,
      plan: plan.nombre,
      camiones: limiteCamiones,
      monto,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error al crear suscripción' }, { status: 500 });
  }
}

// GET — Estado de la suscripción del usuario logueado.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const { data: acceso } = await admin
    .from('accesos')
    .select('tipo, fecha_expiracion, aprobado, mp_preapproval_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!acceso) return NextResponse.json({ plan: null });

  const limiteCamiones = Number(user.user_metadata?.limite_camiones ?? 1);
  const plan = planParaCamiones(limiteCamiones);
  const monto = montoMensual(limiteCamiones);

  return NextResponse.json({
    plan: plan.nombre,
    tipo: acceso.tipo,
    camiones: limiteCamiones,
    monto,
    aprobado: acceso.aprobado,
    fecha_expiracion: acceso.fecha_expiracion,
    mp_preapproval_id: acceso.mp_preapproval_id || null,
  });
}
