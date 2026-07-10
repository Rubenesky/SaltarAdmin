# SaltarAdmin — Imagen opcional al crear un artículo — Design

**Date:** 2026-07-10
**Status:** Approved

## Motivación

Al crear un artículo (colchón, toro mecánico, etc.) no hay forma de asociarle una foto. Se añade la posibilidad de subir una imagen opcional al crearlo, visible después en el detalle del artículo.

## Alcance

- Campo de archivo opcional en el formulario "Nuevo Artículo" de `ManageArticleModal`.
- La imagen se muestra en `ArticleDetailModal`, arriba del nombre/categoría/estado.
- Límite de tamaño de archivo en cliente: 5MB.

Fuera de alcance (decidido explícitamente durante el brainstorming):
- Miniatura en Gestionar Artículos o en las filas del Dashboard — solo se muestra en el detalle del artículo.
- Imagen obligatoria — sigue siendo opcional, igual que ahora se puede crear un artículo sin foto.
- Editar/reemplazar la imagen de un artículo ya existente — solo se añade al crearlo (no forma parte de este alcance; `updateArticuloEstado` y el resto de edición de artículos no cambian).
- Subida vía URL externa — se descartó a favor de subida real de archivo.

## Enfoque técnico

Subida a **Supabase Storage**, bucket nuevo `articulo-imagenes`. Este proyecto no tiene puente entre Clerk (autenticación de la app) y Supabase Auth — la clave usada en el cliente es siempre la clave anónima (`VITE_SUPABASE_ANON_KEY`). Igual que las tablas `articulos`/`reservas` (sin RLS, gap ya conocido y aplazado en rondas anteriores de este proyecto), el bucket debe ser de lectura y escritura públicas para que la subida y la visualización funcionen sin más infraestructura de auth. Se añade un límite de tamaño de archivo (5MB) en el cliente como salvaguarda básica, ya que cualquiera con la URL del proyecto y la clave anónima (ambas ya públicas en el bundle del frontend) podría subir archivos al bucket.

## Base de datos y Storage (entregable SQL)

A ejecutar en el editor SQL de Supabase:

```sql
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
```

## Componentes

### `src/types.ts`

`Articulo` gana un campo:
```ts
export interface Articulo {
  id: string
  nombre: string
  categoria: string
  estado: ArticuloEstado
  imagen_url: string | null
  created_at: string
  updated_at: string
}
```

### `src/lib/supabase.ts`

Nueva función:
```ts
export const uploadArticuloImagen = async (file: File): Promise<string> => {
  const path = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('articulo-imagenes').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('articulo-imagenes').getPublicUrl(path)
  return data.publicUrl
}
```

`createArticulo` gana un parámetro opcional:
```ts
export const createArticulo = async (articulo: {
  nombre: string
  categoria: string
  estado: ArticuloEstado
  imagen_url?: string | null
}): Promise<Articulo> => {
  const { data, error } = await supabase.from('articulos').insert([articulo]).select().single()
  if (error) throw error
  return data
}
```
(El body no cambia — `imagen_url` viaja dentro del objeto `articulo` como cualquier otro campo del insert.)

### `src/components/ManageArticleModal.tsx`

El formulario de creación gana un campo de archivo opcional:
```tsx
<div className="mb-4">
  <label htmlFor="imagenArchivo" className="block text-gray-700">Imagen (opcional):</label>
  <input
    type="file"
    id="imagenArchivo"
    accept="image/*"
    onChange={(e) => setImagenArchivo(e.target.files?.[0] ?? null)}
    className="w-full text-sm text-gray-700"
  />
</div>
```

Nuevo estado: `const [imagenArchivo, setImagenArchivo] = useState<File | null>(null)`.

`handleSubmit` pasa a:
1. Validar tamaño si hay archivo: si `imagenArchivo.size > 5 * 1024 * 1024`, `setError('La imagen no puede superar 5MB.')` y salir sin crear el artículo.
2. Si hay archivo (y pasa la validación), llamar a `uploadArticuloImagen(imagenArchivo)` dentro del mismo `try`; si falla, el `catch` existente ya muestra el error y no se llega a crear el artículo.
3. Llamar a `createArticulo({ nombre, categoria, estado, imagen_url: urlSubida ?? null })`.
4. Al éxito, además de los `set...('')` ya existentes, `setImagenArchivo(null)`.

### `src/components/ArticleDetailModal.tsx`

Justo antes del `<h2>{articulo.nombre}</h2>` actual (dentro del mismo header con el botón de cerrar), si `articulo.imagen_url` existe, se muestra:
```tsx
{articulo.imagen_url && (
  <img
    src={articulo.imagen_url}
    alt={articulo.nombre}
    className="w-full h-48 object-cover rounded-lg mb-4"
  />
)}
```
Si es `null`, no se renderiza nada — sin placeholder.

## Errores

- Subida fallida (red, bucket mal configurado, etc.): mensaje de error visible en `ManageArticleModal`, igual que el resto de errores del formulario; el artículo no se crea.
- Archivo demasiado grande: mismo tratamiento, validado antes de intentar subir.
- Imagen que no carga en `ArticleDetailModal` (URL rota): no se gestiona explícitamente — comportamiento por defecto del navegador (icono de imagen rota), consistente con que esto no es un caso de error de la aplicación sino de un recurso externo.

## Testing

- `npx tsc --noEmit` para verificación de tipos.
- Verificación manual: `ManageArticleModal` y `ArticleDetailModal` están detrás del login de Clerk (no se pueden probar en vivo sin credenciales en este entorno) — se verificará mediante revisión de código cuidadosa, igual que otras funcionalidades de esta sesión detrás del login. Si hay oportunidad de probarlo en vivo (bypass temporal ya usado antes en esta sesión, revertido sin commitear), se hará para confirmar el flujo de subida real contra el bucket de Supabase Storage.
