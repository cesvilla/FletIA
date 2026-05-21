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
  condicion: 'excelente' | 'buena' | 'regular';
  carroceria: 'semirremolque' | 'rigido_caja' | 'volcadora' | 'refrigerado';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface NuevoCamion {
  patente: string;
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