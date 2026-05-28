import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/login'); return null; }

  const empresa = user.user_metadata?.empresa || 'Tu empresa';
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: viajesMes },
    { data: viajesTotal },
    { data: camiones },
    { data: recordatorios },
    { data: precios },
  ] = await Promise.all([
    supabase.from('viajes').select('costo_total, flete_cobrado').eq('user_id', user.id).gte('created_at', firstOfMonth),
    supabase.from('viajes').select('id').eq('user_id', user.id),
    supabase.from('camiones').select('id').eq('user_id', user.id).eq('activo', true),
    supabase.from('recordatorios').select('*').eq('user_id', user.id).eq('completado', false).order('fecha', { ascending: true }),
    supabase.from('precio_combustible').select('*').order('fecha', { ascending: false }).order('empresa').limit(16),
  ]);

  const gastoMes = viajesMes?.reduce((acc, v) => acc + (v.costo_total || 0), 0) || 0;
  const gananciasMes = viajesMes?.reduce((acc, v) => acc + (v.flete_cobrado || 0), 0) || 0;
  const totalViajes = viajesTotal?.length || 0;
  const totalCamiones = camiones?.length || 0;

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
    />
  );
}