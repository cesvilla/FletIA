import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HistorialClient from './HistorialClient';

export default async function HistorialPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viajes } = await supabase
    .from('viajes')
    .select('*, camiones(patente, marca, modelo)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <HistorialClient viajes={viajes || []} email={user.email!} empresa={user.user_metadata?.empresa || 'Tu empresa'} />;
}
