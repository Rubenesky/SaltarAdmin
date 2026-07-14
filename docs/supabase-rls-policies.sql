-- SaltarAdmin: Row Level Security (RLS) + bloqueo de subida anónima de imágenes
--
-- Corrige el bloqueante #1 de la auditoría pre-despliegue (2026-07-14): sin
-- RLS, cualquiera con la clave anónima del proyecto podía leer y escribir
-- toda la base de datos (clientes, reservas, artículos), sin iniciar sesión.
--
-- REQUISITO PREVIO: antes de ejecutar este script, Clerk debe estar
-- registrado como proveedor de Third-Party Auth en este proyecto
-- (Authentication → Third-Party Auth en el panel de Supabase). Si ejecutas
-- este script antes de completar ese paso, ninguna sesión de Clerk podrá
-- leer ni escribir nada -- la app se quedará sin datos hasta que completes
-- el registro del proveedor.
--
-- CÓMO APLICARLA: copia y pega este archivo completo en el editor SQL de
-- Supabase (Dashboard → SQL Editor → New query) y ejecútalo una sola vez.

-- === Tablas: solo usuarios con sesión de Clerk iniciada pueden leer/escribir ===

alter table articulos enable row level security;
create policy "articulos_authenticated_all" on articulos
  for all
  to authenticated
  using (true)
  with check (true);

alter table reservas enable row level security;
create policy "reservas_authenticated_all" on reservas
  for all
  to authenticated
  using (true)
  with check (true);

alter table bloqueos enable row level security;
create policy "bloqueos_authenticated_all" on bloqueos
  for all
  to authenticated
  using (true)
  with check (true);

-- === Storage: la subida de imágenes de artículos deja de ser pública ===
--
-- La lectura pública del bucket 'articulo-imagenes' SE MANTIENE a propósito:
-- las fotos de artículos se muestran con <img src="..."> directamente desde
-- la URL pública, y las etiquetas <img> del navegador no pueden enviar el
-- token de sesión de Clerk como cabecera. Bloquear la lectura rompería la
-- visualización de fotos en toda la app. El riesgo real señalado por la
-- auditoría era la SUBIDA anónima (cualquiera podía llenar el bucket de
-- archivos), no la lectura de fotos de colchones e hinchables, que no son
-- datos sensibles.

drop policy if exists "Subida pública de imágenes de artículos" on storage.objects;

create policy "articulo_imagenes_subida_authenticated"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'articulo-imagenes'
  and (metadata->>'mimetype') in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
);
