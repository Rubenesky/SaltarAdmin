-- Reconstrucción de referencia del esquema de SaltarAdmin, escrita porque
-- no existía ningún script de creación de esquema versionado en el repo
-- (auditoría 2026-07-14, hallazgo de Mantenibilidad/Base de datos).
--
-- Este archivo documenta el esquema tal como se asume que existe en
-- producción a día de hoy. NO se ha ejecutado contra la base de datos real
-- como parte de este cambio — antes de aplicarlo, confirma manualmente que
-- coincide con tu esquema real (por ejemplo, con `\d+ articulos` en el SQL
-- editor de Supabase) y ajusta lo que difiera.

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

create table if not exists articulos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  categoria text not null,
  estado text not null check (estado in ('disponible', 'mantenimiento', 'baja')),
  imagen_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reservas (
  id uuid primary key default uuid_generate_v4(),
  -- ON DELETE RESTRICT: el código (ManageArticleModal.tsx, handleEliminarArticulo)
  -- asume que borrar un artículo con reservas asociadas falla con el código de
  -- error 23503 en vez de borrar esas reservas en cascada. Si tu FK real es
  -- CASCADE, corrígelo aquí y revisa ese manejador de error.
  articulo_id uuid not null references articulos(id) on delete restrict,
  cliente_nombre text not null,
  cliente_telefono text not null,
  cliente_email text,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bloqueos (
  id uuid primary key default uuid_generate_v4(),
  articulo_id uuid not null references articulos(id) on delete restrict,
  fecha_inicio date not null,
  fecha_fin date not null,
  motivo text,
  created_at timestamptz not null default now()
);
