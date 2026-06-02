import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreciosDeHoy } from '@/lib/precios';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/login'); return null; }

  const empresa = user.user_metadata?.empresa || 'Tu empresa';
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // El admin client (service role) se usa para `accesos` y precios, igual que en el
  // resto del código. Para `accesos` filtramos estricto por el id del usuario logueado.
  const admin = createAdminClient();

  const [
    { data: viajesMes },
    { data: viajesTotal },
    { data: camiones },
    { data: recordatorios },
    { data: acceso },
    preciosResult,
  ] = await Promise.all([
    supabase.from('viajes').select('costo_total, flete_cobrado').eq('user_id', user.id).gte('created_at', firstOfMonth),
    supabase.from('viajes').select('id').eq('user_id', user.id),
    supabase.from('camiones').select('id').eq('user_id', user.id).eq('activo', true),
    supabase.from('recordatorios').select('*').eq('user_id', user.id).eq('completado', false).order('fecha', { ascending: true }),
    // Datos de la suscripción/plan del usuario para el aviso de vencimiento.
    admin.from('accesos').select('fecha_expiracion, tipo, aprobado').eq('user_id', user.id).maybeSingle(),
    // Precio de gasoil de hoy: promedio nacional real (Sec. de Energía), cacheado por día.
    getPreciosDeHoy(admin).catch(() => ({ precios: [], fuente: 'referencia' as const })),
  ]);

  const gastoMes = viajesMes?.reduce((acc, v) => acc + (v.costo_total || 0), 0) || 0;
  const gananciasMes = viajesMes?.reduce((acc, v) => acc + (v.flete_cobrado || 0), 0) || 0;
  const totalViajes = viajesTotal?.length || 0;
  const totalCamiones = camiones?.length || 0;
  const precios = preciosResult.precios;
  const preciosFuente = preciosResult.fuente;

  // Vencimiento del plan: días restantes hasta fecha_expiracion (puede ser negativo si ya venció).
  let vencimiento: { fecha: string; dias: number; tipo: string } | null = null;
  if (acceso?.aprobado && acceso?.fecha_expiracion) {
    const exp = new Date(acceso.fecha_expiracion);
    const dias = Math.ceil((exp.getTime() - Date.now()) / 86_400_000);
    vencimiento = { fecha: acceso.fecha_expiracion, dias, tipo: acceso.tipo || 'demo' };
  }

  return (
    <DashboardClient
      email={user.email!}
      empresa={empresa}
      userId={user.id}
      gastoMes={gastoMes}
      gananciasMes={gananciasMes}
      totalViajes={totalViajes}
      totalCamiones={totalCamiones}
      recordatorios={recordatorios || []}
      precios={precios || []}
      preciosFuente={preciosFuente}
      vencimiento={vencimiento}
    />
  );
}