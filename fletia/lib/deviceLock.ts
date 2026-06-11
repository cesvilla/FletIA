// Candado de un solo dispositivo por cuenta (single-session a nivel app).
// Modelo "última sesión gana": el último login es el dueño; cualquier sesión
// anterior se desplaza (se cierra sola en su próxima navegación). Esto permite
// que un mismo cliente pase libremente de la PC al teléfono, e impide el uso
// simultáneo por dos personas con la misma clave.

export const DEVICE_COOKIE = 'fletia_device';

// Lee el token de dispositivo de la cabecera Cookie cruda.
export function leerDeviceToken(cookieHeader: string | null): string | null {
  const cookie = cookieHeader || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
