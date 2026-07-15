-- SaltarAdmin: restricción de no-solapamiento de bloqueos de mantenimiento
-- a nivel de base de datos.
--
-- Mismo patrón que no_solapamiento_reservas (docs/supabase-exclusion-constraint.sql),
-- aplicado a la tabla bloqueos. Sin cláusula WHERE porque bloqueos no tiene
-- campo de estado/cancelado.
--
-- No cubre el caso cruzado reserva-bloqueo: un EXCLUDE constraint de Postgres
-- solo compara filas de la misma tabla. Ese caso sigue dependiendo de
-- hayConflictoDisponibilidad en el cliente (src/lib/supabase.ts).
--
-- CÓMO APLICARLA: copia y pega este archivo completo en el editor SQL de
-- Supabase (Dashboard → SQL Editor → New query) y ejecútalo una sola vez.
-- Requiere la extensión btree_gist, ya habilitada por
-- docs/supabase-exclusion-constraint.sql.

ALTER TABLE bloqueos
  ADD CONSTRAINT no_solapamiento_bloqueos
  EXCLUDE USING gist (
    articulo_id WITH =,
    daterange(fecha_inicio, fecha_fin, '[)') WITH &&
  );
