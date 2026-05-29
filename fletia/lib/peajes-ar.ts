// ─── Base de datos de peajes de Argentina para camiones ──────────────────────
//
// Precios aproximados para CAMIÓN / SEMIRREMOLQUE (5 ejes, categoría 4-5)
// Actualizado: diciembre 2025. Ajustar periódicamente según DNVN / concesionarias.
//
// Fuentes de referencia:
//   - Corredor Vial: AUBASA, GEK, Decsa, Coviares
//   - Cuadros tarifarios publicados por DNVN (Dirección Nacional de Vialidad)
//
// Detección: si algún punto del polyline está dentro de RADIO_KM de la plaza,
// se considera que el viaje pasa por ese peaje.

export const RADIO_DETECCION_KM = 1.8; // Radio de detección en km

export interface PlazaPeaje {
  id: string;
  nombre: string;
  ruta: string;
  lat: number;
  lon: number;
  precioCamion: number; // ARS, categoría 5 (semirremolque)
}

export const PEAJES_AR: PlazaPeaje[] = [

  // ── RN9 / Corredor A: Buenos Aires → Rosario → Córdoba ─────────────────────
  { id: 'rn9_campana',    nombre: 'Campana',              ruta: 'RN9/A001',   lat: -34.1645, lon: -58.9551, precioCamion: 4000 },
  { id: 'rn9_ramallo',    nombre: 'Ramallo',              ruta: 'RN9/A001',   lat: -33.5165, lon: -60.0132, precioCamion: 3500 },
  { id: 'rn9_sannicolas', nombre: 'San Nicolás',          ruta: 'RN9/A001',   lat: -33.3440, lon: -60.2310, precioCamion: 3200 },
  { id: 'rn9_villacanas', nombre: 'Villa Cañás',          ruta: 'RN9/A001',   lat: -34.0041, lon: -61.5959, precioCamion: 3000 },
  { id: 'rn9_villam',     nombre: 'Villa María',          ruta: 'RN9/A001',   lat: -32.4072, lon: -63.2397, precioCamion: 3200 },
  { id: 'rn9_cordoba',    nombre: 'Córdoba (La Calera)',  ruta: 'RN9/A001',   lat: -31.3468, lon: -64.3408, precioCamion: 3800 },

  // ── RN2: Buenos Aires → Mar del Plata ──────────────────────────────────────
  { id: 'rn2_hudson',     nombre: 'Hudson',               ruta: 'RN2',        lat: -34.7985, lon: -58.1623, precioCamion: 3200 },
  { id: 'rn2_samb',       nombre: 'Samborombón',          ruta: 'RN2',        lat: -35.4563, lon: -57.3936, precioCamion: 2800 },
  { id: 'rn2_dolores',    nombre: 'Dolores',              ruta: 'RN2',        lat: -36.3413, lon: -57.6836, precioCamion: 2500 },
  { id: 'rn2_maipu',      nombre: 'Maipú',                ruta: 'RN2',        lat: -36.8711, lon: -57.8791, precioCamion: 2500 },
  { id: 'rn2_mdp',        nombre: 'Mar del Plata',        ruta: 'RN2',        lat: -37.9781, lon: -57.5715, precioCamion: 2800 },

  // ── RN7: Buenos Aires → San Luis → Mendoza ─────────────────────────────────
  { id: 'rn7_lujan',      nombre: 'Luján',                ruta: 'RN7',        lat: -34.5680, lon: -59.1072, precioCamion: 3200 },
  { id: 'rn7_mercedes',   nombre: 'Mercedes',             ruta: 'RN7',        lat: -34.6521, lon: -59.4280, precioCamion: 2800 },
  { id: 'rn7_junin',      nombre: 'Junín',                ruta: 'RN7',        lat: -34.5901, lon: -60.9456, precioCamion: 2800 },
  { id: 'rn7_sluis',      nombre: 'Villa Mercedes (SL)',  ruta: 'RN7',        lat: -33.6762, lon: -65.4612, precioCamion: 3000 },
  { id: 'rn7_mendoza',    nombre: 'Mendoza',              ruta: 'RN7',        lat: -32.8908, lon: -68.8272, precioCamion: 3200 },

  // ── RN3: Buenos Aires → Bahía Blanca → Patagonia ───────────────────────────
  { id: 'rn3_canuelas',   nombre: 'Cañuelas',             ruta: 'RN3',        lat: -35.0537, lon: -58.7360, precioCamion: 2800 },
  { id: 'rn3_azul',       nombre: 'Azul',                 ruta: 'RN3',        lat: -36.7850, lon: -59.8581, precioCamion: 2800 },
  { id: 'rn3_bahia',      nombre: 'Bahía Blanca',         ruta: 'RN3',        lat: -38.6683, lon: -62.3264, precioCamion: 3200 },
  { id: 'rn3_sanant',     nombre: 'San Antonio Oeste',    ruta: 'RN3/RN23',   lat: -40.7277, lon: -64.9533, precioCamion: 2500 },

  // ── RN12 / RN14: Mesopotamia ───────────────────────────────────────────────
  { id: 'puente_zarate',  nombre: 'Puente Zárate-Brazo Largo', ruta: 'RN12',  lat: -33.9376, lon: -58.7236, precioCamion: 5800 },
  { id: 'rn14_gualeg',    nombre: 'Gualeguaychú',         ruta: 'RN14',       lat: -33.0122, lon: -58.5236, precioCamion: 2800 },
  { id: 'rn14_concord',   nombre: 'Concordia',            ruta: 'RN14',       lat: -31.3928, lon: -58.0204, precioCamion: 2500 },

  // ── GBA - Accesos y autopistas urbanas ─────────────────────────────────────
  { id: 'gba_norte',      nombre: 'Acceso Norte (Panamericana)', ruta: 'Acceso Norte', lat: -34.4794, lon: -58.5575, precioCamion: 2000 },
  { id: 'gba_oeste',      nombre: 'Acceso Oeste',         ruta: 'AU A6',      lat: -34.6408, lon: -58.5298, precioCamion: 1800 },
  { id: 'gba_ricchieri',  nombre: 'Autopista Ricchieri',  ruta: 'AU Ricchieri',lat: -34.6447, lon: -58.4748, precioCamion: 1600 },
  { id: 'gba_25mayo',     nombre: 'Autopista 25 de Mayo', ruta: 'AU 25 Mayo', lat: -34.6328, lon: -58.4436, precioCamion: 1600 },
  { id: 'gba_laplata',    nombre: 'Autopista BsAs–La Plata', ruta: 'AUBASA',  lat: -34.7446, lon: -58.2727, precioCamion: 2200 },

  // ── AP01: Rosario → Córdoba ────────────────────────────────────────────────
  { id: 'ap01_marcos',    nombre: 'Marcos Juárez',        ruta: 'AP01',       lat: -32.6945, lon: -62.1031, precioCamion: 2800 },
  { id: 'ap01_pilar',     nombre: 'Pilar (Córdoba)',      ruta: 'AP01',       lat: -31.6818, lon: -63.8791, precioCamion: 3000 },

  // ── RN168: Túnel Subfluvial Santa Fe–Paraná ────────────────────────────────
  { id: 'tunel_sf',       nombre: 'Túnel Subfluvial (Santa Fe)', ruta: 'RN168', lat: -31.6490, lon: -60.6986, precioCamion: 3800 },

  // ── RP70: San Lorenzo (Rosario–Santa Fe) ───────────────────────────────────
  { id: 'rp70_sanl',      nombre: 'San Lorenzo',          ruta: 'RP70',       lat: -32.7353, lon: -60.7362, precioCamion: 2500 },

  // ── RN34: Buenos Aires → Tucumán (vía Santiago del Estero) ────────────────
  { id: 'rn34_sde',       nombre: 'Santiago del Estero',  ruta: 'RN34',       lat: -27.7951, lon: -64.2615, precioCamion: 2800 },
  { id: 'rn34_tucuman',   nombre: 'Tucumán',              ruta: 'RN34',       lat: -26.8241, lon: -65.2226, precioCamion: 3000 },

  // ── RN22: Patagonia norte (Neuquén–Bahía Blanca) ───────────────────────────
  { id: 'rn22_choele',    nombre: 'Choele Choel',         ruta: 'RN22',       lat: -39.2848, lon: -65.6662, precioCamion: 2200 },
  { id: 'rn22_neuquen',   nombre: 'Neuquén',              ruta: 'RN22',       lat: -38.9516, lon: -68.0591, precioCamion: 2800 },
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
