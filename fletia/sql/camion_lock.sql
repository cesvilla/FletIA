-- ─── Bloqueo de identidad de camión: columnas + auditoría ─────────────────
--
-- Correr este script una vez en el SQL Editor de Supabase (panel del proyecto).
-- Es idempotente: usa IF NOT EXISTS y CREATE OR REPLACE donde corresponde.
--
-- Qué agrega:
--   1) camiones.ultimo_cambio_patente — timestamp de la última corrección de
--      patente (para el cooldown de 90 días entre correcciones de typo).
--   2) camion_cambios — tabla de auditoría: registra cada cambio sensible
--      (patente, capacidad) con valor viejo y nuevo + RLS estricto.
--
-- Tras correr esto, /api/camiones/[id] PATCH ya empieza a popular ambas cosas
-- automáticamente. No se necesita ningún cambio adicional en código.

-- 1) Columna ultimo_cambio_patente en camiones
ALTER TABLE camiones
  ADD COLUMN IF NOT EXISTS ultimo_cambio_patente timestamptz;

-- 2) Tabla de auditoría
CREATE TABLE IF NOT EXISTS camion_cambios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camion_id uuid NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campo text NOT NULL,                 -- 'patente' | 'capacidad_max_ton' | ...
  valor_viejo text,
  valor_nuevo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS camion_cambios_camion_id_idx ON camion_cambios(camion_id);
CREATE INDEX IF NOT EXISTS camion_cambios_user_id_idx   ON camion_cambios(user_id);

-- 3) Row-level security: cada usuario solo ve / inserta sus propios cambios.
ALTER TABLE camion_cambios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camion_cambios_select_propio" ON camion_cambios;
CREATE POLICY "camion_cambios_select_propio"
  ON camion_cambios FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "camion_cambios_insert_propio" ON camion_cambios;
CREATE POLICY "camion_cambios_insert_propio"
  ON camion_cambios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- (No hay UPDATE ni DELETE de cambios: la auditoría es append-only.)
