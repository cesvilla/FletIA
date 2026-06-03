// ─── Helpers de WhatsApp ──────────────────────────────────────────────────────
//
// Normaliza números argentinos a formato wa.me (solo dígitos, con código de país)
// y arma el link de "click to chat". WhatsApp NO permite iniciar el compartir de
// ubicación en tiempo real por URL — eso lo hace el usuario a mano (📎 → Ubicación
// → En tiempo real). El link solo abre el chat con el destinatario y un texto guía.

// Normaliza a solo dígitos con código de país argentino (54).
// Acepta formatos sueltos: "11 2345-6789", "+54 9 11 2345 6789", "0351 155 123456".
// No intenta ser perfecto (la numeración móvil AR es un quilombo): garantiza dígitos
// y prefijo 54. El dueño ve el número y puede corregirlo si hace falta.
export function normalizarWhatsapp(numero: string): string {
  let d = (numero || '').replace(/\D/g, '');
  if (!d) return '';
  // Quitar 00 internacional inicial
  if (d.startsWith('00')) d = d.slice(2);
  // Si ya tiene código de país argentino, lo dejamos
  if (d.startsWith('54')) return d;
  // Quitar el 0 troncal de larga distancia (ej. 0351...)
  if (d.startsWith('0')) d = d.slice(1);
  return '54' + d;
}

// ¿El número quedó con una longitud plausible para AR? (54 + 10 dígitos ≈ 12,
// con el 9 de móvil ≈ 13). Lo usamos solo para avisar, no para bloquear.
export function whatsappPlausible(numero: string): boolean {
  const d = normalizarWhatsapp(numero);
  return d.length >= 12 && d.length <= 14;
}

// Arma el link wa.me con texto opcional.
export function linkWhatsapp(numero: string, texto?: string): string {
  const d = normalizarWhatsapp(numero);
  const base = `https://wa.me/${d}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
