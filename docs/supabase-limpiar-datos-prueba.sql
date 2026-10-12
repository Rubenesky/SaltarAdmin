-- Borra todos los datos de prueba (bloqueos, reservas, artículos) para dejar
-- la base de datos limpia antes de cargar los artículos reales del negocio.
--
-- Orden importante: bloqueos y reservas referencian a articulos por FK
-- (ON DELETE RESTRICT), así que hay que borrarlos primero o el DELETE de
-- articulos fallaría con el error 23503.
--
-- Ejecutar en Supabase Dashboard > SQL Editor. Esto es irreversible.

delete from bloqueos;
delete from reservas;
delete from articulos;
