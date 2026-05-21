import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ViajesClient from './ViajesClient';

export default async function ViajesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: camiones } = await supabase
    .from('camiones')
    .select('id, patente, marca, modelo, consumo_base_litros, capacidad_max_ton, condicion')
    .eq('user_id', user.id)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  const { data: viajes } = await supabase
    .from('viajes')
    .select('*, camiones(patente, marca, modelo)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const empresa = user.user_metadata?.empresa || 'Tu empresa';

  return (
    <ViajesClient
      camiones={camiones || []}
      viajesIniciales={viajes || []}
      empresa={empresa}
      email={user.email!}
    />
  );
}