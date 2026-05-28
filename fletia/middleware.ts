import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/registro', '/pendiente', '/vencido'];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname === p + '/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api');

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

  // No logueado → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logueado pero email no confirmado
  if (user && !user.email_confirmed_at && !isPublic) {
    return NextResponse.redirect(new URL('/login?pendiente=1', request.url));
  }

  // Admin tiene acceso libre a todo (incluyendo /admin)
  if (user && user.email === ADMIN_EMAIL) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return supabaseResponse;
  }

  // Logueado en /login → dashboard
  if (user && user.email_confirmed_at && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Verificar acceso para rutas protegidas (no públicas, no admin)
  if (user && user.email_confirmed_at && !isPublic) {
    // No admin → bloquear /admin
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Consultar estado del acceso
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
      // Si falla la verificación, dejar pasar (mejor UX)
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
