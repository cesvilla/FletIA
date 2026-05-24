import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RentabilidadClient from './RentabilidadClient';

export default async function RentabilidadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viajes } = await supabase
    .from('viajes')
    .select('*, camiones(patente, marca, modelo)')
    .eq('user_id', user.id)
    .not('flete_cobrado', 'is', null)
    .order('created_at', { ascending: false });

  const empresa = user.user_metadata?.empresa || 'Tu empresa';

  return (
    <RentabilidadClient
      viajes={viajes || []}
      empresa={empresa}
      email={user.email!}
    />
  );
}
