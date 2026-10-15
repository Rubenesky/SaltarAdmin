-- SaltarAdmin: correcciones de la auditoría de base de datos de 2026-10.
--
-- Agrupa varios hallazgos independientes (reservas "fantasma" con fecha
-- vacía, categorías sin validar en el servidor, updated_at que nunca se
-- actualiza, un índice que falta, trazabilidad de quién hizo cada cambio,
-- e infraestructura de búsqueda de texto). Cada sección indica a qué
-- hallazgo corresponde y por qué.
--
-- CÓMO APLICARLO: copia y pega este archivo completo en el editor SQL de
-- Supabase (Dashboard → SQL Editor → New query) y ejecútalo una sola vez.
--
-- ANTES DE EJECUTAR NADA DE ESTE ARCHIVO: docs/supabase-schema.sql advierte
-- en su propia cabecera que es una reconstrucción de referencia NO
-- verificada contra la base de datos real. En particular, confirma a mano
-- que el ON DELETE de la FK articulo_id (en reservas y en bloqueos) es
-- efectivamente RESTRICT, ejecutando en el SQL Editor:
--
--   \d+ reservas
--   \d+ bloqueos
--
-- El código de la app (ManageArticleModal.tsx, handleEliminarArticulo) da
-- por hecho que borrar un artículo con reservas asociadas falla con el
-- código de error 23503 (violación de FK) en vez de borrar esas reservas o
-- bloqueos en cascada. Si el ON DELETE real resultara ser CASCADE en vez de
-- RESTRICT, habría pérdida silenciosa de datos (reservas borradas sin
-- aviso) cada vez que alguien elimina un artículo. Esto no se puede
-- corregir con un ALTER genérico sin saber primero cuál es el estado real,
-- así que es un paso de verificación manual, no un ALTER de este archivo.


-- =============================================================================
-- 1. CHECK de fechas válidas en reservas y bloqueos
-- =============================================================================
-- Hoy se puede crear o editar una reserva (o un bloqueo) con
-- fecha_inicio == fecha_fin. Eso genera un daterange vacío
-- (daterange(x, x, '[)') no contiene ninguna fecha), que no choca con el
-- EXCLUDE constraint de no-solapamiento (docs/supabase-exclusion-constraint.sql,
-- docs/supabase-bloqueos-exclusion-constraint.sql) ni con la comprobación de
-- disponibilidad del cliente (hayConflictoReserva / hayConflictoDisponibilidad
-- en src/lib/supabase.ts), porque ambas comparan rangos y un rango vacío no
-- se solapa con nada. El resultado es una reserva o bloqueo "fantasma": existe
-- en la tabla, pero no bloquea el artículo para nadie.
--
-- AVISO: si ya existe alguna fila en `reservas` o en `bloqueos` con
-- fecha_inicio >= fecha_fin, el ALTER TABLE correspondiente fallará. En ese
-- caso hay que corregir o borrar esa fila a mano antes de poder aplicar el
-- constraint (mismo tipo de aviso que ya usa
-- docs/supabase-exclusion-constraint.sql para el EXCLUDE constraint).

alter table reservas
  add constraint reservas_fechas_validas check (fecha_inicio < fecha_fin);

alter table bloqueos
  add constraint bloqueos_fechas_validas check (fecha_inicio < fecha_fin);


-- =============================================================================
-- 2. CHECK de categoría válida en articulos
-- =============================================================================
-- Las categorías válidas solo estaban validadas en el cliente
-- (src/lib/categorias.ts), no en la base de datos. Esto ya causó un bug de
-- datos real por una discrepancia de mayúsculas/minúsculas entre lo que
-- había en la tabla y lo que esperaba el código, corregido a mano una vez
-- con docs/supabase-actualizar-categorias-mayusculas.sql. Este CHECK evita
-- que vuelva a pasar, rechazando en el servidor cualquier categoría que no
-- sea una de las tres canónicas.
--
-- IMPORTANTE: si en el futuro se añade una categoría nueva, hay que
-- actualizar este CHECK a la vez que la constante CATEGORIAS de
-- src/lib/categorias.ts. Si solo se actualiza el código, cualquier insert o
-- update con la categoría nueva fallará con un error de constraint en vez
-- de guardarse.

alter table articulos
  add constraint articulos_categoria_check
  check (categoria in ('Colchón Hinchable', 'Colchón Acuático', 'Servicios'));


-- =============================================================================
-- 3. Trigger para que updated_at se actualice de verdad
-- =============================================================================
-- La columna updated_at existe en articulos y en reservas (con default
-- now()), pero nada la actualiza en un UPDATE posterior: hoy se queda
-- congelada en la fecha de creación de la fila para siempre.

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articulos_updated_at on articulos;
create trigger trg_articulos_updated_at
  before update on articulos
  for each row execute function set_updated_at();

drop trigger if exists trg_reservas_updated_at on reservas;
create trigger trg_reservas_updated_at
  before update on reservas
  for each row execute function set_updated_at();


-- =============================================================================
-- 4. Índice btree para getReservasPorArticulo
-- =============================================================================
-- getReservasPorArticulo (src/lib/supabase.ts) trae TODAS las reservas de un
-- artículo -- incluidas las canceladas -- ordenadas por fecha. El único
-- índice que existe hoy sobre (articulo_id, fecha) es el GiST del EXCLUDE
-- constraint de no-solapamiento, que es parcial (WHERE estado <> 'cancelada'):
-- no cubre las reservas canceladas, así que esa consulta sigue haciendo un
-- escaneo secuencial para incluirlas. Este índice normal sí cubre todas las
-- filas, en el orden que la consulta necesita.

create index if not exists idx_reservas_articulo_id
  on reservas (articulo_id, fecha_inicio desc);


-- =============================================================================
-- 5. Trazabilidad mínima de quién hizo cada cambio (actor_id)
-- =============================================================================
-- Ninguna tabla registra hoy qué cuenta de Clerk insertó o modificó una
-- fila. Esto es relevante porque las políticas RLS del proyecto
-- (docs/supabase-rls-policies.sql) dan acceso total de lectura/escritura a
-- cualquier cuenta autenticada, sin distinción de rol: si un ex-empleado
-- conserva su cuenta de Clerk activa, hoy no quedaría ningún rastro de qué
-- fila creó o modificó.
--
-- Esto es SOLO auditoría/trazabilidad: no cambia quién puede leer o
-- escribir en ninguna tabla, las políticas RLS siguen exactamente igual.
-- Tampoco requiere ningún cambio en el código de la app: el trigger rellena
-- actor_id automáticamente a partir del claim "sub" del JWT de Clerk (el
-- mismo que usa auth.jwt() en el resto de políticas del proyecto), así que
-- las queries de src/lib/supabase.ts no necesitan tocarse.

alter table articulos add column if not exists actor_id text;
alter table reservas add column if not exists actor_id text;
alter table bloqueos add column if not exists actor_id text;

create or replace function set_actor_id()
returns trigger as $$
begin
  new.actor_id = auth.jwt()->>'sub';
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articulos_actor_id on articulos;
create trigger trg_articulos_actor_id
  before insert or update on articulos
  for each row execute function set_actor_id();

drop trigger if exists trg_reservas_actor_id on reservas;
create trigger trg_reservas_actor_id
  before insert or update on reservas
  for each row execute function set_actor_id();

drop trigger if exists trg_bloqueos_actor_id on bloqueos;
create trigger trg_bloqueos_actor_id
  before insert or update on bloqueos
  for each row execute function set_actor_id();


-- =============================================================================
-- 6. Extensión e índices de búsqueda de texto (solo infraestructura)
-- =============================================================================
-- Preparación para cuando el volumen de reservas crezca y buscar por nombre
-- o teléfono de cliente empiece a necesitar algo mejor que un LIKE con
-- escaneo secuencial. Esto es SOLO infraestructura (extensión + índices);
-- el cambio de código para usarla (por ejemplo, una búsqueda con similitud
-- en src/lib/supabase.ts) se evalúa aparte y no se aplica en este archivo.

create extension if not exists pg_trgm;

create index if not exists idx_reservas_cliente_nombre_trgm
  on reservas using gin (cliente_nombre gin_trgm_ops);

create index if not exists idx_reservas_cliente_telefono_trgm
  on reservas using gin (cliente_telefono gin_trgm_ops);


-- =============================================================================
-- 7. Límite de tamaño de archivo en Storage (config del dashboard, no SQL)
-- =============================================================================
-- El límite de 5MB para la imagen de un artículo solo se valida hoy en el
-- cliente (ManageArticleModal.tsx). No se valida en el bucket de Storage.
-- Cualquier cuenta autenticada podría saltarse el formulario y subir un
-- archivo mucho más grande llamando directamente a la API de Storage.
--
-- Esto NO se puede corregir con SQL: hay que ir al panel de Supabase
-- (Dashboard → Storage → bucket "articulo-imagenes", ver
-- docs/supabase-articulo-imagen.sql → Settings) y establecer ahí el
-- "file size limit" del bucket a 5MB (o el valor que corresponda), a mano.


-- =============================================================================
-- 8. Nota sobre la policy de subida pública de Storage
-- =============================================================================
-- docs/supabase-articulo-imagen.sql se corrigió aparte: su policy pública
-- de INSERT en storage.objects (sin "to authenticated") se eliminó de ese
-- archivo, porque docs/supabase-rls-policies.sql ya la sustituye por una
-- restringida a authenticated. Ejecutar supabase-articulo-imagen.sql
-- DESPUÉS de supabase-rls-policies.sql en un entorno nuevo ya no puede
-- reintroducir la subida anónima. Ver el comentario en ese archivo para más
-- detalle. No hace falta ningún ALTER adicional aquí para este punto.
