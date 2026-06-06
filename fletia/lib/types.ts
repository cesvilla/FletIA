export interface Camion {
  id: string;
  user_id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  alias: string | null;
  tipo_combustible: 'diesel' | 'gnc' | 'electrico';
  capacidad_max_ton: number;
  consumo_base_litros: number;
  consumo_pendiente_litros: number | null;
  condicion: 'excelente' | 'buena' | 'regular';
  carroceria: 'semirremolque' | 'rigido_caja' | 'volcadora' | 'refrigerado';
  activo: boolean;
  created_at: string;
  updated_at: string;
  ultimo_cambio_patente?: string | null;
}

export interface NuevoCamion {
  patente: string;
  patente_semi?: string;
  marca: string;
  modelo: string;
  anio: number;
  alias?: string;
  tipo_combustible: 'diesel' | 'gnc' | 'electrico';
  capacidad_max_ton: number;
  consumo_base_litros: number;
  condicion: 'excelente' | 'buena' | 'regular';
  carroceria: 'semirremolque' | 'rigido_caja' | 'volcadora' | 'refrigerado';
}
