// ─── Base de datos de peajes de Argentina para camiones ──────────────────────
//
// Precios para CAMIÓN / SEMIRREMOLQUE (categoría pesada, 5-6 ejes).
// ÚLTIMA ACTUALIZACIÓN: MAYO 2026.
//
// Anclajes confirmados (fuentes oficiales / prensa 2026):
//   - Corredores Viales Nacionales (Res. 248/2026, vig. 26-feb-2026):
//     categoría 5 (pesados) = $7.500 por plaza  → RN9, RN7, RN34, AP01, Ricchieri.
//   - AUBASA / Autovía 2 (RN2, ene-2026): plazas troncales pesados ≈ $34.900.
//   - Túnel Subfluvial Santa Fe–Paraná: 5-6 ejes ≈ $21.000.
//   - Zárate–Brazo Largo (Autovía del Mercosur, vig. may-2026): pesados ≈ $30.000.
//   - Accesos Norte/Oeste y AUSA CABA: cuadros 2026.
//
// IMPORTANTE: las tarifas argentinas se ajustan cada 1-3 meses. Estos valores son
// REFERENCIALES; el usuario puede corregir el total en el campo "Peajes".
// Revisar periódicamente: argentina.gob.ar/transporte/vialidad-nacional, aubasa.com.ar.
//
// Detección: si algún punto del polyline está dentro de RADIO_KM de la plaza,
// se considera que el viaje pasa por ese peaje.

export const RADIO_DETECCION_KM = 1.8; // Radio de detección en km

// ─── Control de actualización de tarifas ─────────────────────────────────────
// Las tarifas argentinas se ajustan cada 1-3 meses. Marcamos cuándo se revisaron
// por última vez y a los cuántos días consideramos que están "vencidas" para
// avisarle al owner (en /admin y en el monitoreo) que toca revisarlas.
export const PEAJES_ACTUALIZADO = '2026-05-01'; // YYYY-MM-DD — última revisión de tarifas
export const PEAJES_REVISION_DIAS = 90;          // recordar revisar cada trimestre

export interface EstadoPeajes {
  fecha: string;        // fecha de última actualización (YYYY-MM-DD)
  diasDesde: number;    // días transcurridos desde esa fecha
  desactualizado: boolean; // true si pasó el umbral de revisión
}

export function estadoActualizacionPeajes(hoy: Date = new Date()): EstadoPeajes {
  const base = new Date(PEAJES_ACTUALIZADO + 'T00:00:00');
  const diasDesde = Math.max(0, Math.floor((hoy.getTime() - base.getTime()) / 86_400_000));
  return { fecha: PEAJES_ACTUALIZADO, diasDesde, desactualizado: diasDesde > PEAJES_REVISION_DIAS };
}

export interface PlazaPeaje {
  id: string;
  nombre: string;
  ruta: string;
  lat: number;
  lon: number;
  precioCamion: number; // ARS, categoría 5 (semirremolque)
}

export const PEAJES_AR: PlazaPeaje[] = [

  // ── RN9 / Corredor A: Buenos Aires → Rosario → Córdoba (Corredores Viales) ──
  { id: 'rn9_campana',    nombre: 'Campana',              ruta: 'RN9/A001',   lat: -34.1645, lon: -58.9551, precioCamion: 7500 },
  { id: 'rn9_ramallo',    nombre: 'Ramallo',              ruta: 'RN9/A001',   lat: -33.5165, lon: -60.0132, precioCamion: 7500 },
  { id: 'rn9_sannicolas', nombre: 'San Nicolás',          ruta: 'RN9/A001',   lat: -33.3440, lon: -60.2310, precioCamion: 7500 },
  { id: 'rn9_villacanas', nombre: 'Villa Cañás',          ruta: 'RN9/A001',   lat: -34.0041, lon: -61.5959, precioCamion: 7500 },
  { id: 'rn9_villam',     nombre: 'Villa María',          ruta: 'RN9/A001',   lat: -32.4072, lon: -63.2397, precioCamion: 7500 },
  { id: 'rn9_cordoba',    nombre: 'Córdoba (La Calera)',  ruta: 'RN9/A001',   lat: -31.3468, lon: -64.3408, precioCamion: 7500 },

  // ── RN2: Buenos Aires → Mar del Plata (AUBASA / Autovía 2) ─────────────────
  { id: 'rn2_hudson',     nombre: 'Hudson',               ruta: 'RN2',        lat: -34.7985, lon: -58.1623, precioCamion: 18000 },
  { id: 'rn2_samb',       nombre: 'Samborombón',          ruta: 'RN2',        lat: -35.4563, lon: -57.3936, precioCamion: 34900 },
  { id: 'rn2_dolores',    nombre: 'Dolores',              ruta: 'RN2',        lat: -36.3413, lon: -57.6836, precioCamion: 18000 },
  { id: 'rn2_maipu',      nombre: 'Maipú',                ruta: 'RN2',        lat: -36.8711, lon: -57.8791, precioCamion: 34900 },
  { id: 'rn2_mdp',        nombre: 'Mar del Plata',        ruta: 'RN2',        lat: -37.9781, lon: -57.5715, precioCamion: 18000 },

  // ── RN7: Buenos Aires → San Luis → Mendoza (Corredores Viales) ─────────────
  { id: 'rn7_lujan',      nombre: 'Luján',                ruta: 'RN7',        lat: -34.5680, lon: -59.1072, precioCamion: 7500 },
  { id: 'rn7_mercedes',   nombre: 'Mercedes',             ruta: 'RN7',        lat: -34.6521, lon: -59.4280, precioCamion: 7500 },
  { id: 'rn7_junin',      nombre: 'Junín',                ruta: 'RN7',        lat: -34.5901, lon: -60.9456, precioCamion: 7500 },
  { id: 'rn7_sluis',      nombre: 'Villa Mercedes (SL)',  ruta: 'RN7',        lat: -33.6762, lon: -65.4612, precioCamion: 6500 },
  { id: 'rn7_mendoza',    nombre: 'Mendoza',              ruta: 'RN7',        lat: -32.8908, lon: -68.8272, precioCamion: 6500 },

  // ── RN3: Buenos Aires → Bahía Blanca → Patagonia ───────────────────────────
  { id: 'rn3_canuelas',   nombre: 'Cañuelas',             ruta: 'RN3',        lat: -35.0537, lon: -58.7360, precioCamion: 7500 },
  { id: 'rn3_azul',       nombre: 'Azul',                 ruta: 'RN3',        lat: -36.7850, lon: -59.8581, precioCamion: 6500 },
  { id: 'rn3_bahia',      nombre: 'Bahía Blanca',         ruta: 'RN3',        lat: -38.6683, lon: -62.3264, precioCamion: 6500 },
  { id: 'rn3_sanant',     nombre: 'San Antonio Oeste',    ruta: 'RN3/RN23',   lat: -40.7277, lon: -64.9533, precioCamion: 5000 },

  // ── RN12 / RN14: Mesopotamia ───────────────────────────────────────────────
  { id: 'puente_zarate',  nombre: 'Puente Zárate-Brazo Largo', ruta: 'RN12',  lat: -33.9376, lon: -58.7236, precioCamion: 30000 },
  { id: 'rn14_gualeg',    nombre: 'Gualeguaychú',         ruta: 'RN14',       lat: -33.0122, lon: -58.5236, precioCamion: 6000 },
  { id: 'rn14_concord',   nombre: 'Concordia',            ruta: 'RN14',       lat: -31.3928, lon: -58.0204, precioCamion: 6000 },

  // ── GBA - Accesos y autopistas urbanas ─────────────────────────────────────
  { id: 'gba_norte',      nombre: 'Acceso Norte (Panamericana)', ruta: 'Acceso Norte', lat: -34.4794, lon: -58.5575, precioCamion: 7000 },
  { id: 'gba_oeste',      nombre: 'Acceso Oeste',         ruta: 'AU A6',      lat: -34.6408, lon: -58.5298, precioCamion: 7000 },
  { id: 'gba_ricchieri',  nombre: 'Autopista Ricchieri',  ruta: 'AU Ricchieri',lat: -34.6447, lon: -58.4748, precioCamion: 7500 },
  { id: 'gba_25mayo',     nombre: 'Autopista 25 de Mayo', ruta: 'AU 25 Mayo', lat: -34.6328, lon: -58.4436, precioCamion: 8000 },
  { id: 'gba_laplata',    nombre: 'Autopista BsAs–La Plata', ruta: 'AUBASA',  lat: -34.7446, lon: -58.2727, precioCamion: 12000 },

  // ── AP01: Rosario → Córdoba (Corredores Viales) ────────────────────────────
  { id: 'ap01_marcos',    nombre: 'Marcos Juárez',        ruta: 'AP01',       lat: -32.6945, lon: -62.1031, precioCamion: 7500 },
  { id: 'ap01_pilar',     nombre: 'Pilar (Córdoba)',      ruta: 'AP01',       lat: -31.6818, lon: -63.8791, precioCamion: 7500 },

  // ── RN168: Túnel Subfluvial Santa Fe–Paraná ────────────────────────────────
  { id: 'tunel_sf',       nombre: 'Túnel Subfluvial (Santa Fe)', ruta: 'RN168', lat: -31.6490, lon: -60.6986, precioCamion: 21000 },

  // ── RP70: San Lorenzo (Rosario–Santa Fe) ───────────────────────────────────
  { id: 'rp70_sanl',      nombre: 'San Lorenzo',          ruta: 'RP70',       lat: -32.7353, lon: -60.7362, precioCamion: 5000 },

  // ── RN34: Buenos Aires → Tucumán (Corredores Viales) ───────────────────────
  { id: 'rn34_sde',       nombre: 'Santiago del Estero',  ruta: 'RN34',       lat: -27.7951, lon: -64.2615, precioCamion: 7500 },
  { id: 'rn34_tucuman',   nombre: 'Tucumán',              ruta: 'RN34',       lat: -26.8241, lon: -65.2226, precioCamion: 7500 },

  // ── RN22: Patagonia norte (Neuquén–Bahía Blanca) ───────────────────────────
  { id: 'rn22_choele',    nombre: 'Choele Choel',         ruta: 'RN22',       lat: -39.2848, lon: -65.6662, precioCamion: 5000 },
  { id: 'rn22_neuquen',   nombre: 'Neuquén',              ruta: 'RN22',       lat: -38.9516, lon: -68.0591, precioCamion: 5000 },
];

// ─── Distancia Haversine (km) ────────────────────────────────────────────────
function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ResultadoPeajes {
  plazas: Array<{ nombre: string; ruta: string; precio: number }>;
  total: number;
}

// ─── Detección: qué plazas están sobre el polyline ───────────────────────────
export function calcularPeajesEnRuta(
  polyline: [number, number][],
  radio = RADIO_DETECCION_KM
): ResultadoPeajes {
  const encontradas: Array<{ nombre: string; ruta: string; precio: number }> = [];

  for (const plaza of PEAJES_AR) {
    let detectada = false;
    for (const [lat, lon] of polyline) {
      if (distanciaKm(plaza.lat, plaza.lon, lat, lon) <= radio) {
        detectada = true;
        break;
      }
    }
    if (detectada) {
      encontradas.push({
        nombre: plaza.nombre,
        ruta: plaza.ruta,
        precio: plaza.precioCamion,
      });
    }
  }

  const total = encontradas.reduce((sum, p) => sum + p.precio, 0);
  return { plazas: encontradas, total };
}
