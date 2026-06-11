// Candado de un solo dispositivo por cuenta (single-session a nivel app).
// Centraliza la constante de la cookie y la ventana de actividad para que el
// endpoint de login (claim) y el de verificación (GET /api/accesos) compartan
// exactamente la misma lógica.

export const DEVICE_COOKIE = 'fletia_device';

// Minutos sin navegar tras los cuales el dispositivo dueño se considera
// inactivo. Mientras esté activo, ningún otro dispositivo puede iniciar sesión.
// Pasado ese tiempo, otro dispositivo puede tomar el control (evita que una
// cuenta quede trabada para siempre si alguien limpia o pierde sus cookies).
export const ACTIVE_WINDOW_MIN = 5;

// Lee el token de dispositivo de la cabecera Cookie cruda.
export function leerDeviceToken(cookieHeader: string | null): string | null {
  const cookie = cookieHeader || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ¿La marca de actividad sigue dentro de la ventana "activa"?
export function dispositivoActivo(seenAt: string | null | undefined): boolean {
  if (!seenAt) return false;
  return Date.now() - new Date(seenAt).getTime() < ACTIVE_WINDOW_MIN * 60_000;
}
