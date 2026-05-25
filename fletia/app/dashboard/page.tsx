import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

/**
 * Dashboard (Server Component).
 * Verifica que el usuario esté logueado.
 * Si no, lo redirige al login.
 */
// updated
export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const empresa = user.user_metadata?.empresa || 'Tu empresa';

  return <DashboardClient email={user.email!} empresa={empresa} />;
}
