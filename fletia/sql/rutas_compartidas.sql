-- ─── Rutas compartidas con choferes ──────────────────────────────────────────
-- Link de solo lectura que el dueño manda al camionero (mapa, peajes, clima,
-- tráfico). El snapshot se guarda completo → al abrir el link NO se vuelven a
-- llamar las APIs externas. El link expira solo y se puede cerrar a mano.
--
-- Correr en el SQL Editor de Supabase.

create table if not exists public.rutas_compartidas (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  chofer_nombre   text,
  chofer_celular  text,
  owner_whatsapp  text,
  snapshot      jsonb not null,        -- {origen,destino,km,duracionMin,polyline,peajes,clima,trafico}
  estado        text not null default 'activa',  -- activa | finalizada
  created_at    timestamptz not null default now(),
  expira_en     timestamptz not null
);

create index if not exists idx_rutas_compartidas_token on public.rutas_compartidas (token);
create index if not exists idx_rutas_compartidas_user  on public.rutas_compartidas (user_id);

-- El acceso se hace siempre con el cliente admin (service_role) desde las rutas API,
-- así que damos permisos a ese rol (igual que con precio_combustible).
grant select, insert, update on public.rutas_compartidas to service_role;

-- (Opcional) si más adelante querés RLS para lectura directa, habilitarla acá.
-- alter table public.rutas_compartidas enable row level security;
