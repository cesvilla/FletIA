import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/registro', '/pendiente', '/vencido', '/reset-password'];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Leer ADMIN_EMAIL dentro de la función para garantizar disponibilidad en Edge Runtime
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;

  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname === p + '/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api');

  // /admin siempre va a login si no hay sesión de admin (nunca a /pendiente)
  if (pathname.startsWith('/admin') && !isPublic) {
    // Se resuelve más abajo después de obtener el user
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Admin tiene acceso libre — check PRIMERO, antes de todo
  if (user && user.email === ADMIN_EMAIL) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return supabaseResponse;
  }

  // Si intenta acceder a /admin pero NO es admin → siempre al login (nunca a /pendiente)
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // No logueado → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logueado pero email no confirmado
  if (user && !user.email_confirmed_at && !isPublic) {
    return NextResponse.redirect(new URL('/login?pendiente=1', request.url));
  }

  // Logueado en /login → dashboard
  if (user && user.email_confirmed_at && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Verificar acceso para rutas protegidas
  if (user && user.email_confirmed_at && !isPublic) {
    try {
      const baseUrl = request.nextUrl.origin;
      const res = await fetch(`${baseUrl}/api/accesos?user_id=${user.id}`, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
      const data = await res.json();

      if (data.estado === 'pendiente' && pathname !== '/pendiente') {
        return NextResponse.redirect(new URL('/pendiente', request.url));
      }
      if (data.estado === 'vencido' && pathname !== '/vencido') {
        return NextResponse.redirect(new URL('/vencido', request.url));
      }
    } catch {
      // Si falla la verificación, dejar pasar
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
