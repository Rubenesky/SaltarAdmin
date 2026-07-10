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

-- Subida pública (sin RLS de por medio, igual que el resto del proyecto).
create policy "Subida pública de imágenes de artículos"
on storage.objects for insert
with check (bucket_id = 'articulo-imagenes');
