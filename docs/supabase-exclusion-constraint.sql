-- SaltarAdmin: restricción de no-solapamiento de reservas a nivel de base de datos
--
-- La app ya valida en el cliente que no se puedan crear/editar reservas con
-- fechas solapadas para el mismo artículo (ver hayConflictoReserva en
-- src/lib/supabase.ts). Esta restricción añade la misma garantía a nivel de
-- PostgreSQL, cerrando el caso límite de dos escrituras concurrentes que
-- pasen la validación del cliente casi al mismo tiempo.
--
-- CÓMO APLICARLA: copia y pega este archivo completo en el editor SQL de
-- Supabase (Dashboard → SQL Editor → New query) y ejecútalo una sola vez.
--
-- AVISO: si en la tabla `reservas` ya existieran dos reservas activas
-- (estado distinto de 'cancelada') que se solapan en fechas para el mismo
-- articulo_id, el ALTER TABLE de abajo fallará. En ese caso habría que
-- cancelar o corregir manualmente esas reservas antes de poder aplicar la
-- restricción.

-- Habilita el tipo de índice necesario para la restricción (una sola vez por proyecto)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Impide dos reservas activas del mismo artículo con fechas solapadas
ALTER TABLE reservas
  ADD CONSTRAINT no_solapamiento_reservas
  EXCLUDE USING gist (
    articulo_id WITH =,
    daterange(fecha_inicio, fecha_fin, '[]') WITH &&
  )
  WHERE (estado <> 'cancelada');
