import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PreApproval } from 'mercadopago';

// Webhook de MercadoPago: recibe notificaciones de suscripciones.
// MercadoPago no firma los webhooks, así que validamos consultando la API.
// URL a configurar en MP: https://flet-ia.vercel.app/api/suscripcion/webhook

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

export async function POST(request: Request) {
  if (!MP_TOKEN) return NextResponse.json({ ok: true }); // silencioso si no hay token

  try {
    const payload = await request.json();
    const topic = payload?.type || payload?.topic;
    const dataId = payload?.data?.id || payload?.id;

    if (!dataId) return NextResponse.json({ ok: true });

    // Solo procesamos notificaciones de suscripciones (preapproval)
    if (topic !== 'subscription_preapproval' && topic !== 'preapproval') {
      return NextResponse.json({ ok: true });
    }

    const preApproval = new PreApproval({ accessToken: MP_TOKEN });
    const sub = await preApproval.get({ id: String(dataId) });

    if (!sub) return NextResponse.json({ ok: true });

    const mpStatus = sub.status; // authorized | paused | cancelled | pending
    const externalRef = sub.external_reference; // user_id

    if (!externalRef) return NextResponse.json({ ok: true });

    const admin = createAdminClient();

    // Mapear estado de MP → estado en FletIA
    if (mpStatus === 'authorized') {
      // Pago activo: renovar por 30 días, marcar como cliente
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
      await admin
        .from('accesos')
        .update({
          aprobado: true,
          tipo: 'cliente',
          fecha_expiracion: fechaExpiracion.toISOString(),
          mp_preapproval_id: String(dataId),
        })
        .eq('user_id', externalRef);
    } else if (mpStatus === 'cancelled') {
      // Cancelado: revocar acceso al vencer (no inmediato, respetamos el período pagado)
      // No hacemos nada: el acceso caduca solo por fecha_expiracion.
    } else if (mpStatus === 'paused') {
      // Pausado (pago fallido): no extendemos, el sistema lo marca vencido al expirar.
    }

    return NextResponse.json({ ok: true, status: mpStatus });
  } catch (err: any) {
    // El webhook SIEMPRE devuelve 200 para que MP no reintente infinitamente.
    return NextResponse.json({ ok: false, error: err?.message?.slice(0, 80) });
  }
}
