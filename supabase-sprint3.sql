-- ============================================
-- FletIA — Sprint 3: Tabla de viajes
-- ============================================
-- Ejecutá esto en Supabase → SQL Editor
-- ============================================

CREATE TABLE viajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  camion_id UUID REFERENCES camiones(id) ON DELETE SET NULL,

  -- Datos del viaje
  origen TEXT,
  destino TEXT,
  kilometros DECIMAL(8,1) NOT NULL,
  peso_carga DECIMAL(6,2) NOT NULL,
  tipo_ruta TEXT NOT NULL DEFAULT 'mixta',
  terreno TEXT NOT NULL DEFAULT 'plano',
  precio_combustible DECIMAL(10,2) NOT NULL,

  -- Resultados de la IA
  factor_peso DECIMAL(4,2),
  factor_ruta DECIMAL(4,2),
  factor_terreno DECIMAL(4,2),
  consumo_real DECIMAL(6,2),
  litros_totales DECIMAL(8,2),
  costo_total DECIMAL(12,2),
  costo_por_km DECIMAL(8,2),
  porcentaje_carga INTEGER,
  descripcion_ia TEXT,

  -- Rentabilidad
  flete_cobrado DECIMAL(12,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX viajes_user_id_idx ON viajes(user_id);
CREATE INDEX viajes_camion_id_idx ON viajes(camion_id);

-- Seguridad
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus viajes"
  ON viajes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuario crea sus viajes"
  ON viajes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON viajes TO authenticated;
