import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/registro'];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname === p + "/") || pathname.startsWith('/_next') || pathname.startsWith('/api');

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

  // No logueado intentando acceder a ruta protegida
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logueado pero email no confirmado
  if (user && !user.email_confirmed_at && !isPublic) {
    return NextResponse.redirect(new URL('/login?pendiente=1', request.url));
  }

  // Logueado con email confirmado intentando acceder a login
  if (user && user.email_confirmed_at && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
