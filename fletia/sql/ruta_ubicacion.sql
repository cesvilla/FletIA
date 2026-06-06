-- ─── Seguimiento en vivo del chofer ──────────────────────────────────────────
-- Agrega a rutas_compartidas la última posición reportada por el chofer mientras
-- viaja. El chofer abre su link, activa "Compartir en vivo" y la página manda su
-- GPS (watchPosition) al backend cada ~15s. El dueño ve el punto moverse en un
-- mapa. NO depende de WhatsApp.
--
-- Correr en el SQL Editor de Supabase (ya aplicado vía MCP en producción).

ALTER TABLE public.rutas_compartidas
  ADD COLUMN IF NOT EXISTS chofer_lat double precision,
  ADD COLUMN IF NOT EXISTS chofer_lon double precision,
  ADD COLUMN IF NOT EXISTS chofer_ubicacion_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_activo boolean NOT NULL DEFAULT false;
