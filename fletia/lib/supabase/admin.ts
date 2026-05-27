import { createClient } from '@supabase/supabase-js';

// Cliente con service_role — solo usar en rutas API del servidor, nunca en el cliente
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
