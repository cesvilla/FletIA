import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreciosDeHoy } from '@/lib/precios';
import ViajesClient from './ViajesClient';

export default async function ViajesPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Traer camiones del usuario para el selector
  const { data: camiones } = await supabase
    .from('camiones')
    .select('id, patente, marca, modelo, consumo_base_litros, capacidad_max_ton, condicion')
    .eq('user_id', user.id)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  // Traer últimos 10 viajes
  const { data: viajes } = await supabase
    .from('viajes')
    .select('*, camiones(patente, marca, modelo)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Precio de gasoil de hoy ajustado a la provincia del cliente (fuente viva +
  // factor regional) para el selector de la calculadora.
  const provincia = user.user_metadata?.provincia as string | undefined;
  // fetchSiFalta:false → la página no bloquea en la descarga del CSV; lee caché
  // (la deja caliente el cron diario / la API al cambiar de provincia).
  const { precios } = await getPreciosDeHoy(createAdminClient(), provincia, { fetchSiFalta: false })
    .catch(() => ({ precios: [] as { empresa: string; tipo: string; precio: number; fecha: string }[] }));

  const empresa = user.user_metadata?.empresa || 'Tu empresa';

  return (
    <ViajesClient
      camiones={camiones || []}
      viajesIniciales={viajes || []}
      empresa={empresa}
      email={user.email!}
      precios={precios || []}
      provincia={provincia}
    />
  );
}
