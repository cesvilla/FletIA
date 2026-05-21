import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CamionesClient from './CamionesClient';

export default async function CamionesPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Traer camiones del usuario directamente desde el servidor
  const { data: camiones } = await supabase
    .from('camiones')
    .select('*')
    .eq('user_id', user.id)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  const empresa = user.user_metadata?.empresa || 'Tu empresa';

  return (
    <CamionesClient
      camionesIniciales={camiones || []}
      empresa={empresa}
      email={user.email!}
    />
  );
}
