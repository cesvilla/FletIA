-- ============================================
-- FletIA — Sprint 2: Tabla de camiones
-- ============================================
-- Ejecutá esto en Supabase → SQL Editor → New Query
-- ============================================

-- Tabla principal de camiones
CREATE TABLE camiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Identificación
  patente TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  alias TEXT,
  
  -- Técnico
  tipo_combustible TEXT NOT NULL DEFAULT 'diesel',
  capacidad_max_ton DECIMAL(6,2) NOT NULL,
  consumo_base_litros DECIMAL(6,2) NOT NULL,
  condicion TEXT NOT NULL DEFAULT 'excelente',
  carroceria TEXT NOT NULL DEFAULT 'semirremolque',
  
  -- Estado
  activo BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para que cada usuario solo vea sus camiones
CREATE INDEX camiones_user_id_idx ON camiones(user_id);

-- Seguridad: cada usuario solo puede ver y tocar sus propios camiones
ALTER TABLE camiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus camiones"
  ON camiones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuario crea sus camiones"
  ON camiones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario edita sus camiones"
  ON camiones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuario elimina sus camiones"
  ON camiones FOR DELETE
  USING (auth.uid() = user_id);
