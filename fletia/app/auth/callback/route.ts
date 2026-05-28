import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options: any }[]) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;

      // Admin nunca toca la tabla accesos, va directo al panel
      if (data.user.email === adminEmail) {
        return NextResponse.redirect(`${origin}/admin`);
      }

      // Usuario normal: crear acceso pendiente solo si no existe
      await fetch(`${origin}/api/accesos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user.id,
          email: data.user.email,
          empresa: data.user.user_metadata?.empresa || '',
        }),
      });

      return NextResponse.redirect(`${origin}/pendiente`);
    }
  }

  // Si algo falla, mandar al login
  return NextResponse.redirect(`${origin}/login`);
}
