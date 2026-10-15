-- Columna nueva para guardar la URL pública de la imagen del artículo.
alter table articulos add column imagen_url text;

-- Bucket público para las imágenes de artículos.
insert into storage.buckets (id, name, public)
values ('articulo-imagenes', 'articulo-imagenes', true)
on conflict (id) do nothing;

-- Lectura pública (necesaria para mostrar la imagen sin login).
create policy "Lectura pública de imágenes de artículos"
on storage.objects for select
using (bucket_id = 'articulo-imagenes');

-- NOTA: este archivo tenía aquí una policy de subida PÚBLICA (sin "to
-- authenticated") para storage.objects. Se quitó porque
-- docs/supabase-rls-policies.sql la sustituye por completo con
-- "articulo_imagenes_subida_authenticated" (restringida a usuarios
-- autenticados con sesión de Clerk, misma lista de mimetypes permitidos).
-- Si este archivo se ejecuta en un entorno nuevo DESPUÉS de
-- supabase-rls-policies.sql, mantener la policy pública aquí reintroduciría
-- la vulnerabilidad de subida anónima que ese otro script corrige: basta con
-- ejecutar ambos scripts (en cualquier orden) y la policy restringida de
-- supabase-rls-policies.sql queda como la única vigente para INSERT.
