-- Actualiza la categoría de los artículos ya introducidos para que coincida
-- con las nuevas categorías capitalizadas del código (src/lib/categorias.ts).
-- Sin esto, el agrupado del Dashboard no reconocería estos artículos porque
-- el agrupado compara el texto exacto (sensible a mayúsculas/minúsculas).
--
-- Ejecutar en Supabase Dashboard > SQL Editor.

update articulos set categoria = 'Colchón Hinchable' where categoria = 'colchón hinchable';
update articulos set categoria = 'Colchón Acuático' where categoria = 'colchón acuático';
update articulos set categoria = 'Servicios' where categoria = 'servicios';
