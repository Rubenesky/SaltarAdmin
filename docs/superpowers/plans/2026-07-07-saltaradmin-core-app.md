# SaltarAdmin Core App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken data flow (reservations never save, history page crashes) and complete the remaining SaltarAdmin features (calendar coloring, article management, article detail modal with bloqueos) per `docs/superpowers/specs/2026-07-07-saltaradmin-core-app-design.md`.

**Architecture:** A single-page React app. All Supabase access goes through typed functions in `src/lib/supabase.ts`, backed by shared types in `src/types.ts`. `App.tsx` owns modal/view state and a `refreshKey` counter used to force remount-and-refetch of `Calendar`/`ReservationHistory` after any mutation. `Calendar.tsx` renders availability as a green FullCalendar background event per resource, with reservations (red) and bloqueos (gray) as foreground events layered on top.

**Tech Stack:** React 18, TypeScript (strict), Vite, Tailwind CSS, Clerk, Supabase JS v2, FullCalendar v6 (`@fullcalendar/react`, `@fullcalendar/resource-timeline`, `@fullcalendar/interaction`).

## Global Constraints

- Header gradient: `from-blue-700 to-orange-500`. Title: "🗄️ SaltarAdmin" (`text-2xl font-bold`).
- Corporate colors: primary blue `#1a56db`, orange `#ed8936`, green `#16a34a`, red `#dc2626`, light gray `#f3f4f6`.
- Reservation states and colors: pendiente=`bg-yellow-100`, confirmada=`bg-green-100`, cancelada=`bg-red-100`, completada=`bg-blue-100`.
- Article states: `disponible`, `mantenimiento`, `baja`. Calendar shows only `disponible` articles.
- Article categories (free-text column, no DB constraint — confirmed live against Supabase): `colchón viscoelástico`, `colchón muelles`, `colchón látex`, `toro mecánico`, `fiesta espuma`, `otro`.
- Calendar view: `resourceTimelineMonth` — rows = articles, columns = days. Green = available, red = reserved, gray = blocked (bloqueo).
- Font: Inter, loaded globally.
- No automated test framework is installed in this project (confirmed: no test runner in `package.json`). Per the approved spec, "testing" for this plan means: (a) `npx tsc -p tsconfig.json --noEmit` after every file change, and (b) a manual browser walkthrough in the final task. Do not add a test framework — out of scope.
- `npm run build` must succeed with zero TypeScript errors before the plan is considered done (Vercel deploy requirement).

---

### Task 1: Repo hygiene — gitignore, build scripts, remove dead code

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Delete: `src/hooks/useSupabase.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `npm run build` and `npm run preview` scripts that later tasks and final verification rely on.

- [ ] **Step 1: Update `.gitignore`**

Replace the entire contents of `.gitignore` with:

```
.aider*
node_modules/
dist/
.env.local
.env*.local
```

- [ ] **Step 2: Add build/preview scripts to `package.json`**

In `package.json`, change the `"scripts"` block from:

```json
"scripts": {
  "dev": "vite"
},
```

to:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
},
```

- [ ] **Step 3: Delete the dead hook file**

Delete `src/hooks/useSupabase.ts`. It imports `getArticles`, `getReservations`, `createReservation`, `createArticle` — none of which exist in `src/lib/supabase.ts`. No component imports this file (verified via grep of `useSupabase` usages — all real usages import from `../lib/supabase`, not `../hooks/useSupabase`).

- [ ] **Step 4: Verify the delete didn't break anything**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: Same pre-existing errors as before this task (there will still be errors until Task 2 lands — this step only confirms deleting the hook file itself introduced no new "Cannot find module" errors elsewhere). If any other file imports `src/hooks/useSupabase`, this command will report it — there should be none.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json src/hooks/useSupabase.ts
git commit -m "chore: fix gitignore, add build/preview scripts, remove dead useSupabase hook"
```

---

### Task 2: Data layer — types and Supabase functions

**Files:**
- Create: `src/types.ts`
- Modify: `src/lib/supabase.ts` (full rewrite)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by every later task):
  - Types: `Articulo`, `ArticuloEstado`, `Reserva`, `ReservaConArticulo`, `ReservaEstado`, `Bloqueo`
  - Functions: `getArticulos(): Promise<Articulo[]>`, `getArticulosDisponibles(): Promise<Articulo[]>`, `createArticulo(input): Promise<Articulo>`, `updateArticuloEstado(id: string, estado: ArticuloEstado): Promise<void>`, `getReservas(): Promise<ReservaConArticulo[]>`, `getReservasPorArticulo(articuloId: string): Promise<Reserva[]>`, `createReserva(input): Promise<Reserva>`, `updateReservaEstado(id: string, estado: ReservaEstado): Promise<void>`, `getBloqueos(articuloId?: string): Promise<Bloqueo[]>`, `createBloqueo(input): Promise<Bloqueo>`, `deleteBloqueo(id: string): Promise<void>`
  - `supabase` client export (unchanged usage).

- [ ] **Step 1: Create `src/types.ts`**

```ts
export type ArticuloEstado = 'disponible' | 'mantenimiento' | 'baja'
export type ReservaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'

export interface Articulo {
  id: string
  nombre: string
  categoria: string
  estado: ArticuloEstado
  created_at: string
  updated_at: string
}

export interface Reserva {
  id: string
  articulo_id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string | null
  fecha_inicio: string
  fecha_fin: string
  estado: ReservaEstado
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ReservaConArticulo extends Reserva {
  articulos: { nombre: string } | null
}

export interface Bloqueo {
  id: string
  articulo_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  created_at: string
}
```

- [ ] **Step 2: Rewrite `src/lib/supabase.ts`**

Replace the entire file with:

```ts
import { createClient } from '@supabase/supabase-js'
import type {
  Articulo,
  ArticuloEstado,
  Bloqueo,
  Reserva,
  ReservaConArticulo,
  ReservaEstado,
} from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Artículos

export const getArticulos = async (): Promise<Articulo[]> => {
  const { data, error } = await supabase.from('articulos').select('*').order('nombre')
  if (error) throw error
  return data ?? []
}

export const getArticulosDisponibles = async (): Promise<Articulo[]> => {
  const { data, error } = await supabase
    .from('articulos')
    .select('*')
    .eq('estado', 'disponible')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export const createArticulo = async (articulo: {
  nombre: string
  categoria: string
  estado: ArticuloEstado
}): Promise<Articulo> => {
  const { data, error } = await supabase.from('articulos').insert([articulo]).select().single()
  if (error) throw error
  return data
}

export const updateArticuloEstado = async (id: string, estado: ArticuloEstado): Promise<void> => {
  const { error } = await supabase.from('articulos').update({ estado }).eq('id', id)
  if (error) throw error
}

// Reservas

export const getReservas = async (): Promise<ReservaConArticulo[]> => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, articulos(nombre)')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReservaConArticulo[]
}

export const getReservasPorArticulo = async (articuloId: string): Promise<Reserva[]> => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('articulo_id', articuloId)
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const createReserva = async (reserva: {
  articulo_id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email?: string | null
  fecha_inicio: string
  fecha_fin: string
  notas?: string | null
}): Promise<Reserva> => {
  const { data, error } = await supabase
    .from('reservas')
    .insert([{ ...reserva, estado: 'pendiente' }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateReservaEstado = async (id: string, estado: ReservaEstado): Promise<void> => {
  const { error } = await supabase.from('reservas').update({ estado }).eq('id', id)
  if (error) throw error
}

// Bloqueos

export const getBloqueos = async (articuloId?: string): Promise<Bloqueo[]> => {
  let query = supabase.from('bloqueos').select('*').order('fecha_inicio')
  if (articuloId) query = query.eq('articulo_id', articuloId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export const createBloqueo = async (bloqueo: {
  articulo_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
}): Promise<Bloqueo> => {
  const { data, error } = await supabase.from('bloqueos').insert([bloqueo]).select().single()
  if (error) throw error
  return data
}

export const deleteBloqueo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('bloqueos').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: Errors will remain in `App.tsx`, `Calendar.tsx`, `ReserveModal.tsx`, `ManageArticleModal.tsx`, `ReservationHistory.tsx` (they still reference the old shape) — that's expected until their tasks land. There must be **zero** errors reported inside `src/types.ts` or `src/lib/supabase.ts` themselves.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/lib/supabase.ts
git commit -m "feat: add typed data layer for articulos, reservas, bloqueos"
```

---

### Task 3: Global styling — corporate colors, Inter font, calendar background-event CSS

**Files:**
- Modify: `tailwind.config.js`
- Modify: `index.html`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind color tokens (`primary`, `accent`, `success`, `danger`, `light-gray`) and the `.fc-bg-event` opacity override that Task 8 (Calendar) relies on to render a fully-opaque green background.

- [ ] **Step 1: Update `tailwind.config.js`**

Replace the entire file with:

```js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#1a56db',
        accent: '#ed8936',
        success: '#16a34a',
        danger: '#dc2626',
        'light-gray': '#f3f4f6',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Load the Inter font in `index.html`**

In `index.html`, add these three lines inside `<head>`, right after the `<meta name="viewport" ...>` line:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Apply the font and the calendar CSS override in `src/index.css`**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

/* FullCalendar renders background events (used for the "available" green
   base layer in the resource timeline) at 0.3 opacity by default, which
   washes the color out. Force full opacity so it reads as solid green. */
.fc-bg-event {
  opacity: 1;
}
```

- [ ] **Step 4: Visually sanity-check (dev server not required yet)**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No new errors — this task touches no `.ts`/`.tsx` files.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js index.html src/index.css
git commit -m "style: add corporate color tokens, Inter font, calendar bg-event override"
```

---

### Task 4: Fix and extend `ReserveModal.tsx`

**Files:**
- Modify: `src/components/ReserveModal.tsx` (full rewrite)

**Interfaces:**
- Consumes: `createReserva`, `getArticulosDisponibles` from `src/lib/supabase.ts`; `Articulo` from `src/types.ts` (Task 2).
- Produces: `ReserveModal` component with props `{ isOpen: boolean; onClose: () => void; onReservaCreada: () => void; articuloId?: string; articuloNombre?: string; fechaInicio?: string; fechaFin?: string }`. When `articuloId`/`fechaInicio`/`fechaFin` are all provided (calendar-cell flow), the article and dates are shown as fixed context. When omitted (header "Nueva Reserva" button flow), the modal shows an article `<select>` and two date inputs instead. Task 9 (App.tsx) relies on this dual-mode behavior and on `onReservaCreada` taking no arguments.

**Design note:** The original user spec requires a header button "📅 Nueva Reserva" that opens this modal directly, with no calendar cell pre-selected. The approved design doc's calendar section assumed the modal is always opened with a pre-selected article+date from a calendar click. This task resolves that gap: the modal supports both entry points by making the context props optional and rendering a picker when they're absent.

- [ ] **Step 1: Rewrite `src/components/ReserveModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { createReserva, getArticulosDisponibles } from '../lib/supabase'
import type { Articulo } from '../types'

interface ReserveModalProps {
  isOpen: boolean
  onClose: () => void
  onReservaCreada: () => void
  articuloId?: string
  articuloNombre?: string
  fechaInicio?: string
  fechaFin?: string
}

const ReserveModal: React.FC<ReserveModalProps> = ({
  isOpen,
  onClose,
  onReservaCreada,
  articuloId,
  articuloNombre,
  fechaInicio,
  fechaFin,
}) => {
  const contextoFijo = Boolean(articuloId && fechaInicio && fechaFin)

  const [articulosDisponibles, setArticulosDisponibles] = useState<Articulo[]>([])
  const [formArticuloId, setFormArticuloId] = useState('')
  const [formFechaInicio, setFormFechaInicio] = useState('')
  const [formFechaFin, setFormFechaFin] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && !contextoFijo) {
      getArticulosDisponibles()
        .then((data) => {
          setArticulosDisponibles(data)
          setFormArticuloId(data[0]?.id ?? '')
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.'))
    }
  }, [isOpen, contextoFijo])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const finalArticuloId = contextoFijo ? articuloId! : formArticuloId
    const finalFechaInicio = contextoFijo ? fechaInicio! : formFechaInicio
    const finalFechaFin = contextoFijo ? fechaFin! : formFechaFin

    if (!finalArticuloId || !finalFechaInicio || !finalFechaFin) {
      setError('Selecciona artículo y fechas.')
      return
    }

    setSaving(true)
    try {
      await createReserva({
        articulo_id: finalArticuloId,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        cliente_email: clienteEmail || null,
        fecha_inicio: finalFechaInicio,
        fecha_fin: finalFechaFin,
        notas: notas || null,
      })
      onReservaCreada()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-1 text-gray-800">📝 Crear Reserva</h2>

        {contextoFijo && (
          <p className="text-sm text-gray-500 mb-4">
            {articuloNombre} · {fechaInicio} → {fechaFin}
          </p>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        <form onSubmit={handleSubmit}>
          {!contextoFijo && (
            <>
              <div className="mb-4">
                <label htmlFor="formArticuloId" className="block text-gray-700">Artículo:</label>
                <select
                  id="formArticuloId"
                  value={formArticuloId}
                  onChange={(e) => setFormArticuloId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {articulosDisponibles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="formFechaInicio" className="block text-gray-700">Desde:</label>
                  <input
                    type="date"
                    id="formFechaInicio"
                    value={formFechaInicio}
                    onChange={(e) => setFormFechaInicio(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="formFechaFin" className="block text-gray-700">Hasta:</label>
                  <input
                    type="date"
                    id="formFechaFin"
                    value={formFechaFin}
                    onChange={(e) => setFormFechaFin(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="mb-4">
            <label htmlFor="clienteNombre" className="block text-gray-700">Nombre del Cliente:</label>
            <input
              type="text"
              id="clienteNombre"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="clienteTelefono" className="block text-gray-700">Teléfono:</label>
            <input
              type="text"
              id="clienteTelefono"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="clienteEmail" className="block text-gray-700">Email (opcional):</label>
            <input
              type="email"
              id="clienteEmail"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="notas" className="block text-gray-700">Notas (opcional):</label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            ✅ Crear Reserva
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition ml-2"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}

export default ReserveModal
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors reported for `src/components/ReserveModal.tsx`. `src/App.tsx` will still show errors (it passes the old prop shape) — expected until Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReserveModal.tsx
git commit -m "fix: correct cliente_nombre field and add standalone reservation mode"
```

---

### Task 5: Rewrite `ManageArticleModal.tsx` — list + inline estado editor

**Files:**
- Modify: `src/components/ManageArticleModal.tsx` (full rewrite)

**Interfaces:**
- Consumes: `getArticulos`, `createArticulo`, `updateArticuloEstado` from `src/lib/supabase.ts`; `Articulo`, `ArticuloEstado` from `src/types.ts` (Task 2).
- Produces: `ManageArticleModal` component with props `{ isOpen: boolean; onClose: () => void; onArticulosChanged: () => void }`. Task 9 (App.tsx) renders this with `onArticulosChanged={handleDataChanged}`.

- [ ] **Step 1: Rewrite `src/components/ManageArticleModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { createArticulo, getArticulos, updateArticuloEstado } from '../lib/supabase'
import type { Articulo, ArticuloEstado } from '../types'

interface ManageArticleModalProps {
  isOpen: boolean
  onClose: () => void
  onArticulosChanged: () => void
}

const CATEGORIAS = [
  'colchón viscoelástico',
  'colchón muelles',
  'colchón látex',
  'toro mecánico',
  'fiesta espuma',
  'otro',
]

const ESTADOS: ArticuloEstado[] = ['disponible', 'mantenimiento', 'baja']

const ManageArticleModal: React.FC<ManageArticleModalProps> = ({ isOpen, onClose, onArticulosChanged }) => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[0])
  const [estado, setEstado] = useState<ArticuloEstado>('disponible')
  const [error, setError] = useState<string | null>(null)

  const cargarArticulos = async () => {
    setLoading(true)
    try {
      const data = await getArticulos()
      setArticulos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) cargarArticulos()
  }, [isOpen])

  if (!isOpen) return null

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

  const handleEstadoChange = async (id: string, nuevoEstado: ArticuloEstado) => {
    setError(null)
    try {
      await updateArticuloEstado(id, nuevoEstado)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">⚙️ Gestionar Artículos</h2>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm mb-4">Cargando...</p>
        ) : (
          <ul className="mb-4 divide-y divide-gray-200 border rounded-lg">
            {articulos.length === 0 ? (
              <li className="px-3 py-2 text-gray-500 text-sm">Sin artículos todavía.</li>
            ) : (
              articulos.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-medium text-gray-800">{a.nombre}</p>
                    <p className="text-xs text-gray-500">{a.categoria}</p>
                  </div>
                  <select
                    value={a.estado}
                    onChange={(e) => handleEstadoChange(a.id, e.target.value as ArticuloEstado)}
                    className="text-sm border rounded-lg px-2 py-1"
                  >
                    {ESTADOS.map((estadoOption) => (
                      <option key={estadoOption} value={estadoOption}>
                        {estadoOption}
                      </option>
                    ))}
                  </select>
                </li>
              ))
            )}
          </ul>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="nombre" className="block text-gray-700">Nombre:</label>
              <input
                type="text"
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="categoria" className="block text-gray-700">Categoría:</label>
              <select
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition ml-2"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            ➕ Nuevo Artículo
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ManageArticleModal
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors reported for `src/components/ManageArticleModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ManageArticleModal.tsx
git commit -m "feat: list existing articles with inline estado editor in ManageArticleModal"
```

---

### Task 6: Create `ArticleDetailModal.tsx`

**Files:**
- Create: `src/components/ArticleDetailModal.tsx`

**Interfaces:**
- Consumes: `getReservasPorArticulo`, `getBloqueos`, `createBloqueo`, `deleteBloqueo` from `src/lib/supabase.ts`; `Articulo`, `Reserva`, `Bloqueo` from `src/types.ts` (Task 2).
- Produces: `ArticleDetailModal` component with props `{ isOpen: boolean; onClose: () => void; articulo: Articulo; onBloqueosChanged: () => void }`. Task 9 (App.tsx) renders this when a resource label is clicked in the calendar (Task 8).

- [ ] **Step 1: Create `src/components/ArticleDetailModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { createBloqueo, deleteBloqueo, getBloqueos, getReservasPorArticulo } from '../lib/supabase'
import type { Articulo, Bloqueo, Reserva } from '../types'

interface ArticleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  articulo: Articulo
  onBloqueosChanged: () => void
}

const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ isOpen, onClose, articulo, onBloqueosChanged }) => {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoInicio, setNuevoInicio] = useState('')
  const [nuevoFin, setNuevoFin] = useState('')
  const [nuevoMotivo, setNuevoMotivo] = useState('')

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([getReservasPorArticulo(articulo.id), getBloqueos(articulo.id)])
      setReservas(r)
      setBloqueos(b)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del artículo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo.id])

  if (!isOpen) return null

  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createBloqueo({
        articulo_id: articulo.id,
        fecha_inicio: nuevoInicio,
        fecha_fin: nuevoFin,
        motivo: nuevoMotivo,
      })
      setNuevoInicio('')
      setNuevoFin('')
      setNuevoMotivo('')
      await cargarDatos()
      onBloqueosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el bloqueo.')
    }
  }

  const handleEliminarBloqueo = async (id: string) => {
    setError(null)
    try {
      await deleteBloqueo(id)
      await cargarDatos()
      onBloqueosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el bloqueo.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800">{articulo.nombre}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {articulo.categoria} · {articulo.estado}
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : (
          <>
            <h3 className="font-semibold text-gray-700 mb-2">Historial de reservas</h3>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reservas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-gray-500">
                        Sin reservas.
                      </td>
                    </tr>
                  ) : (
                    reservas.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">{r.cliente_nombre}</td>
                        <td className="px-3 py-2">
                          {r.fecha_inicio} → {r.fecha_fin}
                        </td>
                        <td className="px-3 py-2 capitalize">{r.estado}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold text-gray-700 mb-2">Bloqueos</h3>
            <ul className="mb-4 divide-y divide-gray-200 border rounded-lg">
              {bloqueos.length === 0 ? (
                <li className="px-3 py-2 text-gray-500 text-sm">Sin bloqueos.</li>
              ) : (
                bloqueos.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      {b.fecha_inicio} → {b.fecha_fin} · {b.motivo}
                    </span>
                    <button onClick={() => handleEliminarBloqueo(b.id)} className="text-red-600 hover:text-red-800">
                      Eliminar
                    </button>
                  </li>
                ))
              )}
            </ul>

            <form onSubmit={handleCrearBloqueo} className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label htmlFor="nuevoInicio" className="block text-xs text-gray-600">Desde:</label>
                <input
                  type="date"
                  id="nuevoInicio"
                  value={nuevoInicio}
                  onChange={(e) => setNuevoInicio(e.target.value)}
                  required
                  className="w-full px-2 py-1 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label htmlFor="nuevoFin" className="block text-xs text-gray-600">Hasta:</label>
                <input
                  type="date"
                  id="nuevoFin"
                  value={nuevoFin}
                  onChange={(e) => setNuevoFin(e.target.value)}
                  required
                  className="w-full px-2 py-1 border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="nuevoMotivo" className="block text-xs text-gray-600">Motivo:</label>
                <input
                  type="text"
                  id="nuevoMotivo"
                  value={nuevoMotivo}
                  onChange={(e) => setNuevoMotivo(e.target.value)}
                  required
                  className="w-full px-2 py-1 border rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Añadir Bloqueo
              </button>
            </form>
          </>
        )}

        <button
          onClick={onClose}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ArticleDetailModal
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors reported for `src/components/ArticleDetailModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ArticleDetailModal.tsx
git commit -m "feat: add ArticleDetailModal with reservation history and bloqueos management"
```

---

### Task 7: Fix `ReservationHistory.tsx`

**Files:**
- Modify: `src/components/ReservationHistory.tsx` (full rewrite)

**Interfaces:**
- Consumes: `getReservas`, `updateReservaEstado` from `src/lib/supabase.ts`; `ReservaConArticulo`, `ReservaEstado` from `src/types.ts` (Task 2).
- Produces: `ReservationHistory` component with no props (unchanged usage from `App.tsx`).

- [ ] **Step 1: Rewrite `src/components/ReservationHistory.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { getReservas, updateReservaEstado } from '../lib/supabase'
import type { ReservaConArticulo, ReservaEstado } from '../types'

const ESTADO_STYLES: Record<ReservaEstado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  completada: 'bg-blue-100 text-blue-800',
}

const ESTADOS: ReservaEstado[] = ['pendiente', 'confirmada', 'cancelada', 'completada']

const ReservationHistory: React.FC = () => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarReservas = async () => {
    setLoading(true)
    try {
      const data = await getReservas()
      setReservas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarReservas()
  }, [])

  const handleEstadoChange = async (id: string, estado: ReservaEstado) => {
    setError(null)
    try {
      await updateReservaEstado(id, estado)
      await cargarReservas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la reserva.')
    }
  }

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando historial...</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">📋 Historial de Reservas</h2>
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha inicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha fin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-gray-500">
                  Sin reservas todavía.
                </td>
              </tr>
            ) : (
              reservas.map((reserva) => (
                <tr key={reserva.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reserva.cliente_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.cliente_telefono}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.articulos?.nombre ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.fecha_inicio}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.fecha_fin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={reserva.estado}
                      onChange={(e) => handleEstadoChange(reserva.id, e.target.value as ReservaEstado)}
                      className={`px-2 py-1 rounded ${ESTADO_STYLES[reserva.estado]}`}
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEstadoChange(reserva.id, 'cancelada')}
                      disabled={reserva.estado === 'cancelada'}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition disabled:opacity-40"
                    >
                      Cancelar Reserva
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReservationHistory
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors reported for `src/components/ReservationHistory.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReservationHistory.tsx
git commit -m "fix: replace invalid innerJoin call with Supabase embed, add estado controls"
```

---

### Task 8: Rewrite `Calendar.tsx` — month view, background-event coloring, click handlers

**Files:**
- Modify: `src/components/Calendar.tsx` (full rewrite)

**Interfaces:**
- Consumes: `getArticulosDisponibles`, `getReservas`, `getBloqueos` from `src/lib/supabase.ts`; `Articulo`, `ReservaConArticulo`, `Bloqueo` from `src/types.ts` (Task 2); relies on the `.fc-bg-event { opacity: 1 }` CSS rule from Task 3.
- Produces: `Calendar` component with props `{ onCeldaClick: (articuloId: string, articuloNombre: string, start: string, end: string) => void; onArticuloClick: (articuloId: string) => void }`. Task 9 (App.tsx) wires both callbacks.

- [ ] **Step 1: Rewrite `src/components/Calendar.tsx`**

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { getArticulosDisponibles, getBloqueos, getReservas } from '../lib/supabase'
import type { Articulo, Bloqueo, ReservaConArticulo } from '../types'

interface CalendarProps {
  onCeldaClick: (articuloId: string, articuloNombre: string, start: string, end: string) => void
  onArticuloClick: (articuloId: string) => void
}

interface ReservaPopoverState {
  x: number
  y: number
  reserva: ReservaConArticulo
}

const Calendar: React.FC<CalendarProps> = ({ onCeldaClick, onArticuloClick }) => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [viewRange, setViewRange] = useState<{ start: string; end: string } | null>(null)
  const [popover, setPopover] = useState<ReservaPopoverState | null>(null)

  const onArticuloClickRef = useRef(onArticuloClick)
  useEffect(() => {
    onArticuloClickRef.current = onArticuloClick
  }, [onArticuloClick])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [a, r, b] = await Promise.all([getArticulosDisponibles(), getReservas(), getBloqueos()])
        setArticulos(a)
        setReservas(r)
        setBloqueos(b)
      } catch (error) {
        console.error('Error cargando el calendario:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const resources = useMemo(() => articulos.map((a) => ({ id: a.id, title: a.nombre })), [articulos])

  const backgroundEvents = useMemo(() => {
    if (!viewRange) return []
    return articulos.map((a) => ({
      id: `bg-${a.id}`,
      resourceId: a.id,
      start: viewRange.start,
      end: viewRange.end,
      display: 'background' as const,
      backgroundColor: '#4ade80',
    }))
  }, [articulos, viewRange])

  const reservaEvents = useMemo(
    () =>
      reservas
        .filter((r) => r.estado !== 'cancelada')
        .map((r) => ({
          id: `reserva-${r.id}`,
          resourceId: r.articulo_id,
          title: r.cliente_nombre,
          start: r.fecha_inicio,
          end: r.fecha_fin,
          backgroundColor: '#dc2626',
          borderColor: '#dc2626',
          extendedProps: { type: 'reserva' as const, reserva: r },
        })),
    [reservas]
  )

  const bloqueoEvents = useMemo(
    () =>
      bloqueos.map((b) => ({
        id: `bloqueo-${b.id}`,
        resourceId: b.articulo_id,
        title: b.motivo || 'Bloqueado',
        start: b.fecha_inicio,
        end: b.fecha_fin,
        backgroundColor: '#9ca3af',
        borderColor: '#9ca3af',
        extendedProps: { type: 'bloqueo' as const },
      })),
    [bloqueos]
  )

  const events = useMemo(
    () => [...backgroundEvents, ...reservaEvents, ...bloqueoEvents],
    [backgroundEvents, reservaEvents, bloqueoEvents]
  )

  const handleDatesSet = (info: DatesSetArg) => {
    setViewRange({ start: info.startStr, end: info.endStr })
  }

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.type === 'reserva') {
      const reserva = info.event.extendedProps.reserva as ReservaConArticulo
      setPopover({ x: info.jsEvent.pageX, y: info.jsEvent.pageY, reserva })
    }
  }

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>
  if (articulos.length === 0) return <div className="p-4 text-center text-gray-500">No hay artículos disponibles.</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg relative">
      <FullCalendar
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineMonth"
        resources={resources}
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineMonth',
        }}
        resourceAreaWidth="200px"
        resourceAreaHeaderContent="Artículos"
        height="auto"
        selectable
        selectOverlap={false}
        datesSet={handleDatesSet}
        select={(info) => {
          if (info.resource?.id) {
            onCeldaClick(info.resource.id, info.resource.title, info.startStr, info.endStr)
          }
        }}
        eventClick={handleEventClick}
        resourceLabelDidMount={(info) => {
          info.el.style.cursor = 'pointer'
          info.el.addEventListener('click', () => onArticuloClickRef.current(info.resource.id))
        }}
      />

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64"
            style={{ top: popover.y + 8, left: popover.x + 8 }}
          >
            <button
              onClick={() => setPopover(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h3 className="font-bold text-gray-800 mb-2">{popover.reserva.cliente_nombre}</h3>
            <p className="text-sm text-gray-600">📞 {popover.reserva.cliente_telefono}</p>
            <p className="text-sm text-gray-600">
              📅 {popover.reserva.fecha_inicio} → {popover.reserva.fecha_fin}
            </p>
            <p className="text-sm text-gray-600 capitalize">Estado: {popover.reserva.estado}</p>
          </div>
        </>
      )}
    </div>
  )
}

export default Calendar
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors reported for `src/components/Calendar.tsx`. If `@fullcalendar/core` type imports fail to resolve, run `npm ls @fullcalendar/core` to confirm it's present in `node_modules` (it is a transitive dependency of `@fullcalendar/react`); if genuinely missing, run `npm install @fullcalendar/core --save-exact` to match the installed `@fullcalendar/react` version before re-running the typecheck.

- [ ] **Step 3: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: switch calendar to resourceTimelineMonth with green/red/gray availability coloring"
```

---

### Task 9: Wire up `App.tsx` and do final verification

**Files:**
- Modify: `src/App.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Calendar` (Task 8), `ManageArticleModal` (Task 5), `ArticleDetailModal` (Task 6), `ReserveModal` (Task 4), `ReservationHistory` (Task 7), `getArticulos` from `src/lib/supabase.ts` (Task 2), `Articulo` from `src/types.ts` (Task 2).
- Produces: the fully wired app — this is the last task, nothing downstream depends on it.

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import React, { useState } from 'react'
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react'
import Calendar from './components/Calendar'
import ManageArticleModal from './components/ManageArticleModal'
import ArticleDetailModal from './components/ArticleDetailModal'
import ReserveModal from './components/ReserveModal'
import ReservationHistory from './components/ReservationHistory'
import { getArticulos } from './lib/supabase'
import type { Articulo } from './types'

function App() {
  const { isSignedIn } = useAuth()
  const [showHistorial, setShowHistorial] = useState(false)
  const [modalReservaOpen, setModalReservaOpen] = useState(false)
  const [modalArticuloOpen, setModalArticuloOpen] = useState(false)
  const [detalleArticulo, setDetalleArticulo] = useState<Articulo | null>(null)
  const [selectedArticuloId, setSelectedArticuloId] = useState('')
  const [selectedArticuloNombre, setSelectedArticuloNombre] = useState('')
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCeldaClick = (articuloId: string, articuloNombre: string, start: string, end: string) => {
    setSelectedArticuloId(articuloId)
    setSelectedArticuloNombre(articuloNombre)
    setSelectedStart(start)
    setSelectedEnd(end)
    setModalReservaOpen(true)
  }

  const handleNuevaReservaClick = () => {
    setShowHistorial(false)
    setSelectedArticuloId('')
    setSelectedArticuloNombre('')
    setSelectedStart('')
    setSelectedEnd('')
    setModalReservaOpen(true)
  }

  const handleArticuloClick = async (articuloId: string) => {
    const articulos = await getArticulos()
    const articulo = articulos.find((a) => a.id === articuloId)
    if (articulo) setDetalleArticulo(articulo)
  }

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1)

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">🗄️ SaltarAdmin</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isSignedIn ? (
            <>
              <button
                onClick={handleNuevaReservaClick}
                className="bg-green-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-green-700 transition"
              >
                📅 Nueva Reserva
              </button>
              <button
                onClick={() => setShowHistorial((prev) => !prev)}
                className="bg-blue-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-blue-700 transition"
              >
                📋 Historial
              </button>
              <button
                onClick={() => setModalArticuloOpen(true)}
                className="bg-gray-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-gray-700 transition"
              >
                ⚙️ Gestionar Artículos
              </button>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal" />
          )}
        </div>
      </nav>
      <main className="p-6">
        {showHistorial ? (
          <ReservationHistory key={`historial-${refreshKey}`} />
        ) : (
          <Calendar
            key={`calendario-${refreshKey}`}
            onCeldaClick={handleCeldaClick}
            onArticuloClick={handleArticuloClick}
          />
        )}
      </main>

      {modalArticuloOpen && (
        <ManageArticleModal
          isOpen={modalArticuloOpen}
          onClose={() => setModalArticuloOpen(false)}
          onArticulosChanged={handleDataChanged}
        />
      )}

      {modalReservaOpen && (
        <ReserveModal
          isOpen={modalReservaOpen}
          onClose={() => setModalReservaOpen(false)}
          articuloId={selectedArticuloId || undefined}
          articuloNombre={selectedArticuloNombre || undefined}
          fechaInicio={selectedStart || undefined}
          fechaFin={selectedEnd || undefined}
          onReservaCreada={handleDataChanged}
        />
      )}

      {detalleArticulo && (
        <ArticleDetailModal
          isOpen={!!detalleArticulo}
          onClose={() => setDetalleArticulo(null)}
          articulo={detalleArticulo}
          onBloqueosChanged={handleDataChanged}
        />
      )}
    </div>
  )
}

export default App
```

- [ ] **Step 2: Full project typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: **Zero errors** across the whole `src/` tree. This is the first point in the plan where the entire project must be error-free — every earlier task left some expected errors in files this task now fixes.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: Build completes successfully and emits a `dist/` folder, with no TypeScript or Vite errors. This is the deploy-readiness gate from the design spec.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire ArticleDetailModal, standalone reservation flow, and refresh handling into App"
```

- [ ] **Step 5: Manual browser verification**

Run: `npm run dev` and open the printed local URL in a browser. Walk through, in order:

1. Sign in with Google (Clerk). Confirm the header shows the gradient, title, and three buttons.
2. Confirm the calendar loads in month view with one row per `disponible` article, and every visible day cell reads as solid green.
3. Click an empty (green) cell → confirm `ReserveModal` opens showing the article name and clicked date as fixed context (no article/date pickers). Submit the form. Confirm the modal closes and the cell for that date range turns red.
4. Click "📅 Nueva Reserva" in the header → confirm `ReserveModal` opens instead with an article `<select>` and two date inputs (no fixed context). Cancel out of it.
5. Click "📋 Historial" → confirm the reservation just created appears with the correct client name, article, and dates (no crash — this is the `.innerJoin()` bug that's now fixed). Change its estado via the dropdown, confirm it updates. Click "Cancelar Reserva" on a different row, confirm its estado becomes `cancelada` and, back in the calendar, that reservation's cell is no longer red.
6. Click "⚙️ Gestionar Artículos" → confirm the existing articles list appears with an inline estado `<select>` per row. Change one article's estado to `mantenimiento`, close the modal, and confirm it disappears from the calendar. Create a new article using one of the accented category options, confirm it appears in the list.
7. Back in the calendar, click an article's name (resource label) → confirm `ArticleDetailModal` opens showing its reservation history and a bloqueos section. Add a bloqueo with a future date range, confirm it appears in the list, close the modal, and confirm that date range now renders gray in the calendar for that article. Reopen the modal and delete the bloqueo, confirm the gray block disappears from the calendar.
8. Click a red (reserved) cell in the calendar → confirm a popover appears with the client's name, phone, dates, and estado (not a modal), and that clicking outside it closes it.

If any step fails, treat it as a bug in the task that owns the affected file — fix there, re-run the relevant typecheck, and re-verify this checklist from that step onward.

---

## Final Self-Review Notes

- **Spec coverage:** All 5 numbered design sections (data layer, calendar, modals, history, layout/style) map to Tasks 1–9. The design doc's one open item (reservation-click behavior) was resolved during brainstorming as a popover (Task 8, `handleEventClick`). The header "Nueva Reserva" button gap (present in the original user spec but not fully reconciled in the design doc) is resolved in Task 4 via the dual-mode `ReserveModal` — documented inline as a design note in that task.
- **Type consistency:** `Articulo`, `ArticuloEstado`, `Reserva`, `ReservaConArticulo`, `ReservaEstado`, `Bloqueo` are defined once in Task 2 and reused verbatim (same names, same shapes) in every later task. Function names (`getArticulos`, `getArticulosDisponibles`, `createArticulo`, `updateArticuloEstado`, `getReservas`, `getReservasPorArticulo`, `createReserva`, `updateReservaEstado`, `getBloqueos`, `createBloqueo`, `deleteBloqueo`) are defined once in Task 2 and consumed with matching signatures everywhere they're used.
- **No placeholders:** every step above contains complete, runnable code — no "TBD" or "similar to Task N" shortcuts.
