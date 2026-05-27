import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const DIAS_AVISO = parseInt(process.env.DIAS_AVISO_VENCIMIENTO || '3');

export async function GET(request: Request) {
  // Verificar que viene del cron de Vercel (o de nosotros)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Buscar usuarios que vencen en exactamente DIAS_AVISO días
  const hoy = new Date();
  const fechaLimiteMin = new Date(hoy);
  fechaLimiteMin.setDate(hoy.getDate() + DIAS_AVISO);
  fechaLimiteMin.setHours(0, 0, 0, 0);

  const fechaLimiteMax = new Date(fechaLimiteMin);
  fechaLimiteMax.setHours(23, 59, 59, 999);

  const { data: proximos, error } = await admin
    .from('accesos')
    .select('*')
    .eq('aprobado', true)
    .gte('fecha_expiracion', fechaLimiteMin.toISOString())
    .lte('fecha_expiracion', fechaLimiteMax.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!proximos || proximos.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0, mensaje: 'Sin vencimientos próximos' });
  }

  const enviados: string[] = [];

  for (const acceso of proximos) {
    const fechaFormateada = new Date(acceso.fecha_expiracion).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Email al USUARIO
    await resend.emails.send({
      from: 'FletIA <onboarding@resend.dev>',
      to: acceso.email,
      subject: `⏳ Tu demo de FletIA vence en ${DIAS_AVISO} días`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f0ede8; padding: 32px;">
          <div style="background: #1a1714; padding: 20px 28px; margin-bottom: 24px;">
            <span style="font-family: Georgia, serif; font-size: 28px; font-weight: 900; color: #fff;">
              Flet<span style="color: #d4440c;">IA</span>
            </span>
          </div>
          <div style="background: #fff; padding: 28px; border: 1px solid rgba(26,23,20,0.1);">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1714;">Hola, ${acceso.empresa || acceso.email} 👋</h2>
            <p style="color: #4a4540; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
              Tu período de prueba de <strong>FletIA</strong> vence el <strong>${fechaFormateada}</strong>,
              es decir, en <strong>${DIAS_AVISO} días</strong>.
            </p>
            <p style="color: #4a4540; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              Para continuar usando FletIA sin interrupciones, contactanos antes de esa fecha.
            </p>
            <div style="background: #f0ede8; padding: 16px; font-size: 13px; color: #8a8278; font-family: monospace;">
              // Tu demo vence: ${fechaFormateada}
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #8a8278; font-family: monospace;">
            FletIA — combustible inteligente
          </div>
        </div>
      `,
    });

    // Email al ADMIN
    await resend.emails.send({
      from: 'FletIA <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `🔔 FletIA — Demo por vencer: ${acceso.empresa || acceso.email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f0ede8; padding: 32px;">
          <div style="background: #1a1714; padding: 20px 28px; margin-bottom: 24px;">
            <span style="font-family: Georgia, serif; font-size: 28px; font-weight: 900; color: #fff;">
              Flet<span style="color: #d4440c;">IA</span>
            </span>
            <span style="color: rgba(255,255,255,0.4); font-size: 12px; margin-left: 12px; font-family: monospace;">/ Admin Alert</span>
          </div>
          <div style="background: #fff; padding: 28px; border: 1px solid rgba(26,23,20,0.1);">
            <h2 style="margin: 0 0 16px; font-size: 18px; color: #c8860a;">⏳ Demo próxima a vencer</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f0ede8;">
                <td style="padding: 10px 0; color: #8a8278; font-family: monospace; font-size: 11px; text-transform: uppercase;">Empresa</td>
                <td style="padding: 10px 0; font-weight: 700; color: #1a1714;">${acceso.empresa || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0ede8;">
                <td style="padding: 10px 0; color: #8a8278; font-family: monospace; font-size: 11px; text-transform: uppercase;">Email</td>
                <td style="padding: 10px 0; color: #1a1714;">${acceso.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0ede8;">
                <td style="padding: 10px 0; color: #8a8278; font-family: monospace; font-size: 11px; text-transform: uppercase;">Vence</td>
                <td style="padding: 10px 0; font-weight: 700; color: #d4440c;">${fechaFormateada} (en ${DIAS_AVISO} días)</td>
              </tr>
            </table>
            <div style="margin-top: 20px;">
              <a href="https://flet-ia.vercel.app/admin"
                style="display: inline-block; background: #1a6b3a; color: #fff; padding: 10px 24px; text-decoration: none; font-family: monospace; font-size: 12px; font-weight: 700;">
                → Ir al panel de admin
              </a>
            </div>
          </div>
        </div>
      `,
    });

    enviados.push(acceso.email);
  }

  return NextResponse.json({ ok: true, enviados: enviados.length, usuarios: enviados });
}
