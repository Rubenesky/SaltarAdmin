# SaltarAdmin Article Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users optionally attach an image when creating a new article, uploaded to Supabase Storage, shown afterward in the article's detail view.

**Architecture:** A new Supabase Storage bucket (`articulo-imagenes`, public) plus a new `imagen_url` column on `articulos`. `ManageArticleModal`'s creation form gets an optional file input that uploads to the bucket before creating the row; `ArticleDetailModal` renders the image when present.

**Tech Stack:** React 18 + TypeScript (strict), `@supabase/supabase-js` (already in use, `supabase.storage` API), Tailwind CSS.

## Global Constraints

- No new npm dependencies. `@supabase/supabase-js`'s `.storage` namespace is already available on the existing `supabase` client in `src/lib/supabase.ts` — no new import needed beyond what's already there.
- This project has no automated test framework (no `test` script in `package.json`, no jest/vitest). Verification for every task is: (1) `npx tsc -p tsconfig.json --noEmit` zero errors, and (2) manual live verification with the Playwright MCP browser tools already available.
- `imagen_url: string | null` is a required (non-optional) field on the `Articulo` type — nullable, not absent, mirroring the existing pattern of `cliente_email: string | null` on `Reserva` in the same file.
- Client-side file size limit: reject files over 5MB with a visible error, before attempting upload.
- The Supabase Storage bucket and the `articulos.imagen_url` column must be created by running `docs/supabase-articulo-imagen.sql` in the Supabase SQL editor. This environment only has the anon/publishable key, which cannot run DDL or create storage buckets — the SQL file is a deliverable for the user to run themselves, same as `docs/supabase-exclusion-constraint.sql` from an earlier round. The upload flow cannot be end-to-end verified against a real bucket until that SQL has been run.
- `ManageArticleModal` is reachable only when signed in (`isSignedIn` from Clerk gates the nav button that opens it in `src/App.tsx`), and this environment has no test credentials. To live-verify Task 2, temporarily edit `src/App.tsx`'s `{isSignedIn ? (` to `{true || isSignedIn ? (`, test, then revert that single line exactly before running the final `tsc` check and committing — do not commit the bypass. This exact technique was already used and independently verified (via `git status`/`git diff`) twice earlier in this project's history.
- `ArticleDetailModal` is NOT login-gated — it opens when clicking an article's name in the Dashboard's resource list, which works whether signed in or not. Task 3 can be verified live directly, no bypass needed.
- Clean up any `.playwright-mcp/` directories or screenshot files created during live verification before committing, and stop any dev server you started.

---

### Task 1: Database/Storage SQL deliverable, types, and data-layer functions

**Files:**
- Create: `docs/supabase-articulo-imagen.sql`
- Modify: `src/types.ts`
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Produces: `Articulo.imagen_url: string | null` (new required field on the existing type); `uploadArticuloImagen(file: File): Promise<string>` (new function, uploads to the `articulo-imagenes` bucket, returns the public URL); `createArticulo` gains an optional `imagen_url?: string | null` parameter on its input object. Tasks 2 and 3 both depend on these exact names and types.

- [ ] **Step 1: Write the SQL deliverable**

Write `docs/supabase-articulo-imagen.sql`:

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

- [ ] **Step 2: Add `imagen_url` to the `Articulo` type**

In `src/types.ts`, change:

```ts
export interface Articulo {
  id: string
  nombre: string
  categoria: string
  estado: ArticuloEstado
  created_at: string
  updated_at: string
}
```

to:

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

- [ ] **Step 3: Add `uploadArticuloImagen` and update `createArticulo`**

In `src/lib/supabase.ts`, change:

```ts
export const createArticulo = async (articulo: {
  nombre: string
  categoria: string
  estado: ArticuloEstado
}): Promise<Articulo> => {
  const { data, error } = await supabase.from('articulos').insert([articulo]).select().single()
  if (error) throw error
  return data
}
```

to:

```ts
export const uploadArticuloImagen = async (file: File): Promise<string> => {
  const path = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('articulo-imagenes').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('articulo-imagenes').getPublicUrl(path)
  return data.publicUrl
}

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

- [ ] **Step 4: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors. If any other file constructs an `Articulo` object literal directly (not from a Supabase query result) without `imagen_url`, this step will surface it — fix by adding `imagen_url: null` to that literal.

- [ ] **Step 5: Commit**

```bash
git add docs/supabase-articulo-imagen.sql src/types.ts src/lib/supabase.ts
git commit -m "feat: add imagen_url field and upload function for articulos"
```

---

### Task 2: Optional image upload in the "Nuevo Artículo" form

**Files:**
- Modify: `src/components/ManageArticleModal.tsx`

**Interfaces:**
- Consumes: `uploadArticuloImagen(file: File): Promise<string>` and `createArticulo({ nombre, categoria, estado, imagen_url? }): Promise<Articulo>` from Task 1, both from `../lib/supabase`.

- [ ] **Step 1: Import `uploadArticuloImagen`**

In `src/components/ManageArticleModal.tsx`, change:

```tsx
import { createArticulo, deleteArticulo, getArticulos, updateArticuloEstado } from '../lib/supabase'
```

to:

```tsx
import { createArticulo, deleteArticulo, getArticulos, updateArticuloEstado, uploadArticuloImagen } from '../lib/supabase'
```

- [ ] **Step 2: Add file state**

Change:

```tsx
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[0])
  const [estado, setEstado] = useState<ArticuloEstado>('disponible')
  const [error, setError] = useState<string | null>(null)
```

to:

```tsx
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[0])
  const [estado, setEstado] = useState<ArticuloEstado>('disponible')
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
```

- [ ] **Step 3: Update `handleSubmit` to validate size, upload, then create**

Change:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createArticulo({ nombre, categoria, estado })
      setNombre('')
      setCategoria(CATEGORIAS[0])
      setEstado('disponible')
      setShowForm(false)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el artículo.')
    }
  }
```

to:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (imagenArchivo && imagenArchivo.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5MB.')
      return
    }

    try {
      const imagenUrl = imagenArchivo ? await uploadArticuloImagen(imagenArchivo) : null
      await createArticulo({ nombre, categoria, estado, imagen_url: imagenUrl })
      setNombre('')
      setCategoria(CATEGORIAS[0])
      setEstado('disponible')
      setImagenArchivo(null)
      setShowForm(false)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el artículo.')
    }
  }
```

- [ ] **Step 4: Add the file input to the form**

Change:

```tsx
            <div className="mb-4">
              <label htmlFor="estado" className="block text-gray-700">Estado:</label>
              <select
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as ArticuloEstado)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              >
                {ESTADOS.map((estadoOption) => (
                  <option key={estadoOption} value={estadoOption}>
                    {estadoOption}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              Crear
            </button>
```

to:

```tsx
            <div className="mb-4">
              <label htmlFor="estado" className="block text-gray-700">Estado:</label>
              <select
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as ArticuloEstado)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              >
                {ESTADOS.map((estadoOption) => (
                  <option key={estadoOption} value={estadoOption}>
                    {estadoOption}
                  </option>
                ))}
              </select>
            </div>
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
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              Crear
            </button>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual live verification with Playwright**

`ManageArticleModal` is behind Clerk's `isSignedIn` gate. Apply the temporary bypass described in Global Constraints (`{isSignedIn ? (` → `{true || isSignedIn ? (` in `src/App.tsx`), start the dev server, then:

1. Click "⚙️ Gestionar Artículos", click "➕ Nuevo Artículo".
2. Confirm the new "Imagen (opcional)" file field appears below "Estado" and above the "Crear" button.
3. Fill in nombre/categoria/estado, leave the image field empty, submit. Confirm the article is created successfully (same as before this change) — this is the no-image path and must keep working unchanged.
4. Create a second article, this time selecting a small real image file for the "Imagen" field, submit. If `docs/supabase-articulo-imagen.sql` has not been run yet against the project's Supabase instance, this will fail with a bucket-not-found error — in that case, note this in the report as an expected/blocked verification step (not a code defect) rather than attempting to work around it in code.
5. Revert the temporary bypass in `src/App.tsx` exactly (confirm with `git diff src/App.tsx` — must be empty) before the final `tsc` run and commit.
6. Clean up: delete any test articles created in step 3/4 (there is no delete-article live-testing precedent needed here beyond the existing "🗑️ Eliminar" button already in `ManageArticleModal`), stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 7: Commit**

```bash
git add src/components/ManageArticleModal.tsx
git commit -m "feat: add optional image upload to Nuevo Articulo form"
```

---

### Task 3: Display the image in the article detail view

**Files:**
- Modify: `src/components/ArticleDetailModal.tsx`

**Interfaces:**
- Consumes: `articulo.imagen_url: string | null` from the `Articulo` prop (Task 1's type change). No new imports needed.

- [ ] **Step 1: Render the image above the header when present**

In `src/components/ArticleDetailModal.tsx`, change:

```tsx
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{articulo.nombre}</h2>
```

to:

```tsx
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {articulo.imagen_url && (
          <img
            src={articulo.imagen_url}
            alt={articulo.nombre}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{articulo.nombre}</h2>
```

The image is placed as the first child of the modal card, above the title/close-button row — not inside that row's flex container, which would squeeze a full-width image next to the small "✕" button.

- [ ] **Step 2: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual live verification with Playwright**

`ArticleDetailModal` is NOT login-gated (opened by clicking an article's name in the Dashboard's resource list on the left). No bypass needed:

1. Navigate to the Dashboard, click an article's name (e.g. any row in the left-hand resource list).
2. Confirm the modal opens and, since this article has no `imagen_url` yet (existing data predates this column), no image is rendered and the layout looks exactly as before (title directly at the top).
3. If Task 2's live verification (Task 2 Step 6.4) succeeded in creating an article with a real `imagen_url`, click that article's name instead and confirm the image renders above the title, full-width, with rounded corners, before the categoria/estado line.
4. Stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 4: Commit**

```bash
git add src/components/ArticleDetailModal.tsx
git commit -m "feat: show article image in ArticleDetailModal when present"
```

---

## Post-implementation

After Task 3 is committed and verified, tell the user to run `docs/supabase-articulo-imagen.sql` in the Supabase SQL editor if they haven't already — the feature is inert without it (uploads will fail with a bucket-not-found error, and the `imagen_url` column won't exist for inserts to write to).
