# SaltarAdmin Calendar Localization and Reservation Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the calendar to Spanish with day-number-only headers, close the double-booking gap in the standalone reservation flow, add a "Gestionar Reservas" edit/cancel modal, add date-order validation, add search to Historial and the new modal, and deliver a DB-level exclusion-constraint SQL file for the user to apply manually in Supabase.

**Architecture:** Small, additive changes across the existing component set. One new data-layer function pair (`hayConflictoReserva`, `updateReserva`) in `src/lib/supabase.ts` is shared by the standalone `ReserveModal` flow and the new `GestionarReservasModal`. One new component (`GestionarReservasModal.tsx`) follows the same modal pattern already used by every other modal in the app (fixed backdrop, `isOpen`/`onClose` props, local loading/error state).

**Tech Stack:** React 18, TypeScript (strict), Vite, Tailwind CSS, Supabase JS v2, FullCalendar v6.

## Global Constraints

- Calendar day headers: only the day number (e.g. "8"), no weekday letter — via `slotLabelFormat={{ day: 'numeric' }}`.
- Calendar language: Spanish — via `locale={esLocale}` from `@fullcalendar/core/locales/es` (confirmed present in `node_modules`). This also auto-translates header button text ("today" → "Hoy", "month" → "Mes") and month names; no manual string translation needed.
- "Eliminar" a reservation means the existing cancel mechanism (`estado = 'cancelada'` via `updateReservaEstado`) — no hard delete, per explicit user decision.
- New header button "📝 Gestionar Reservas" goes between "📅 Nueva Reserva" and "📋 Historial".
- Double-booking check (`hayConflictoReserva`) applies only to: the standalone `ReserveModal` flow (`!contextoFijo`) and the `GestionarReservasModal` edit-save flow. It does NOT apply to the calendar-cell click flow (`contextoFijo`), which is already protected by FullCalendar's `selectOverlap={false}`.
- Date-order validation (`fecha_inicio <= fecha_fin`, plain string comparison — valid for `YYYY-MM-DD`) applies to: `ReserveModal` standalone mode, the bloqueo form in `ArticleDetailModal`, and the edit form in `GestionarReservasModal`.
- Search inputs (Historial, Gestionar Reservas) filter data already loaded in memory (`cliente_nombre`/`cliente_telefono`, case-insensitive substring match) — no new Supabase queries.
- RLS policies, "today's reservations" view, payment tracking, and mobile-usage review are explicitly out of scope for this plan (user deferred them).
- No automated test framework exists in this project. Verification per task is `npx tsc -p tsconfig.json --noEmit` (must show zero new errors); the final task adds `npm run build` and a manual browser walkthrough.

---

### Task 1: Calendar locale and day-number-only headers

**Files:**
- Modify: `src/components/Calendar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no interface changes — `CalendarProps` is unchanged. Purely visual/config changes to the `<FullCalendar>` element.

- [ ] **Step 1: Add the Spanish locale import and the two new props**

In `src/components/Calendar.tsx`, add this import after the existing `EventClickArg` type import (line 5):

```tsx
import esLocale from '@fullcalendar/core/locales/es'
```

Then, in the `<FullCalendar ... />` element, add `locale={esLocale}` and `slotLabelFormat={{ day: 'numeric' }}` right after the `height="auto"` line:

```tsx
        height="auto"
        locale={esLocale}
        slotLabelFormat={{ day: 'numeric' }}
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
```

The rest of the file is unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: localize calendar to Spanish with day-number-only headers"
```

---

### Task 2: Data layer — hayConflictoReserva and updateReserva

**Files:**
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 3 and 6):
  - `hayConflictoReserva(articuloId: string, fechaInicio: string, fechaFin: string, excluirReservaId?: string): Promise<boolean>`
  - `updateReserva(id: string, updates: { cliente_nombre: string; cliente_telefono: string; cliente_email?: string | null; fecha_inicio: string; fecha_fin: string; notas?: string | null }): Promise<void>`

- [ ] **Step 1: Add the two functions**

In `src/lib/supabase.ts`, insert this immediately after the existing `updateReservaEstado` function (after line 95, before the `// Bloqueos` comment):

```ts
export const updateReserva = async (
  id: string,
  updates: {
    cliente_nombre: string
    cliente_telefono: string
    cliente_email?: string | null
    fecha_inicio: string
    fecha_fin: string
    notas?: string | null
  }
): Promise<void> => {
  const { error } = await supabase.from('reservas').update(updates).eq('id', id)
  if (error) throw error
}

export const hayConflictoReserva = async (
  articuloId: string,
  fechaInicio: string,
  fechaFin: string,
  excluirReservaId?: string
): Promise<boolean> => {
  let query = supabase
    .from('reservas')
    .select('id')
    .eq('articulo_id', articuloId)
    .neq('estado', 'cancelada')
    .lt('fecha_inicio', fechaFin)
    .gt('fecha_fin', fechaInicio)
  if (excluirReservaId) query = query.neq('id', excluirReservaId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).length > 0
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add hayConflictoReserva and updateReserva to data layer"
```

---

### Task 3: ReserveModal — date-order validation and overlap check

**Files:**
- Modify: `src/components/ReserveModal.tsx`

**Interfaces:**
- Consumes: `hayConflictoReserva` from `src/lib/supabase.ts` (Task 2).
- Produces: no prop changes — `ReserveModalProps` and `onReservaCreada`/`onClose` behavior are unchanged from the caller's perspective. Only internal validation logic changes.

- [ ] **Step 1: Update the import and handleSubmit**

In `src/components/ReserveModal.tsx`, change the import on line 2 from:

```tsx
import { createReserva, getArticulosDisponibles } from '../lib/supabase'
```

to:

```tsx
import { createReserva, getArticulosDisponibles, hayConflictoReserva } from '../lib/supabase'
```

Then replace the entire `handleSubmit` function (lines 50-81) with:

```tsx
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

    if (finalFechaInicio > finalFechaFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }

    setSaving(true)
    try {
      if (!contextoFijo) {
        const conflicto = await hayConflictoReserva(finalArticuloId, finalFechaInicio, finalFechaFin)
        if (conflicto) {
          setError('Ya existe una reserva para ese artículo en esas fechas.')
          return
        }
      }

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
```

The rest of the file (imports besides line 2, props, JSX) is unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReserveModal.tsx
git commit -m "fix: validate date order and reservation overlap in standalone mode"
```

---

### Task 4: ArticleDetailModal — date-order validation on bloqueo form

**Files:**
- Modify: `src/components/ArticleDetailModal.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no prop changes.

- [ ] **Step 1: Add the validation check**

In `src/components/ArticleDetailModal.tsx`, replace the `handleCrearBloqueo` function (lines 41-59) with:

```tsx
  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (nuevoInicio > nuevoFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }

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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ArticleDetailModal.tsx
git commit -m "fix: validate date order in bloqueo form"
```

---

### Task 5: ReservationHistory — search box

**Files:**
- Modify: `src/components/ReservationHistory.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no prop changes — `ReservationHistory` still takes no props.

- [ ] **Step 1: Add search state and filtering**

In `src/components/ReservationHistory.tsx`, add a new state declaration right after the existing `error` state (after line 17):

```tsx
  const [searchTerm, setSearchTerm] = useState('')
```

Add this right after the `handleEstadoChange` function (after line 43, before `if (loading) return ...` on line 45):

```tsx
  const reservasFiltradas = reservas.filter((r) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return r.cliente_nombre.toLowerCase().includes(term) || r.cliente_telefono.toLowerCase().includes(term)
  })
```

- [ ] **Step 2: Add the search input and use the filtered list**

Insert this JSX right after the `{error && (...)}` block (after line 52, before `<div className="overflow-x-auto">` on line 53):

```tsx
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>
```

Then replace the table body conditional (lines 67-105) with:

```tsx
            {reservas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-gray-500">
                  Sin reservas todavía.
                </td>
              </tr>
            ) : reservasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-gray-500">
                  No se encontraron resultados.
                </td>
              </tr>
            ) : (
              reservasFiltradas.map((reserva) => (
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReservationHistory.tsx
git commit -m "feat: add client name/phone search to ReservationHistory"
```

---

### Task 6: Create GestionarReservasModal.tsx

**Files:**
- Create: `src/components/GestionarReservasModal.tsx`

**Interfaces:**
- Consumes: `getReservas`, `hayConflictoReserva`, `updateReserva`, `updateReservaEstado` from `src/lib/supabase.ts` (Task 2 and pre-existing); `ReservaConArticulo` from `src/types.ts`.
- Produces: `GestionarReservasModal` component with props `{ isOpen: boolean; onClose: () => void; onReservasChanged: () => void }`. Task 7 (App.tsx) renders this with `onReservasChanged={handleDataChanged}`.

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState } from 'react'
import { getReservas, hayConflictoReserva, updateReserva, updateReservaEstado } from '../lib/supabase'
import type { ReservaConArticulo } from '../types'

interface GestionarReservasModalProps {
  isOpen: boolean
  onClose: () => void
  onReservasChanged: () => void
}

const GestionarReservasModal: React.FC<GestionarReservasModalProps> = ({ isOpen, onClose, onReservasChanged }) => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editInicio, setEditInicio] = useState('')
  const [editFin, setEditFin] = useState('')
  const [editNotas, setEditNotas] = useState('')

  const cargarReservas = async () => {
    setLoading(true)
    try {
      const data = await getReservas()
      setReservas(data.filter((r) => r.estado !== 'cancelada'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) cargarReservas()
  }, [isOpen])

  if (!isOpen) return null

  const reservasFiltradas = reservas.filter((r) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return r.cliente_nombre.toLowerCase().includes(term) || r.cliente_telefono.toLowerCase().includes(term)
  })

  const handleEmpezarEdicion = (reserva: ReservaConArticulo) => {
    setError(null)
    setEditingId(reserva.id)
    setEditNombre(reserva.cliente_nombre)
    setEditTelefono(reserva.cliente_telefono)
    setEditEmail(reserva.cliente_email ?? '')
    setEditInicio(reserva.fecha_inicio)
    setEditFin(reserva.fecha_fin)
    setEditNotas(reserva.notas ?? '')
  }

  const handleCancelarEdicion = () => {
    setEditingId(null)
  }

  const handleGuardarEdicion = async (reserva: ReservaConArticulo) => {
    setError(null)

    if (editInicio > editFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }

    try {
      const conflicto = await hayConflictoReserva(reserva.articulo_id, editInicio, editFin, reserva.id)
      if (conflicto) {
        setError('Ya existe otra reserva para ese artículo en esas fechas.')
        return
      }

      await updateReserva(reserva.id, {
        cliente_nombre: editNombre,
        cliente_telefono: editTelefono,
        cliente_email: editEmail || null,
        fecha_inicio: editInicio,
        fecha_fin: editFin,
        notas: editNotas || null,
      })
      setEditingId(null)
      await cargarReservas()
      onReservasChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reserva.')
    }
  }

  const handleCancelarReserva = async (id: string) => {
    setError(null)
    try {
      await updateReservaEstado(id, 'cancelada')
      await cargarReservas()
      onReservasChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">📝 Gestionar Reservas</h2>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : reservas.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay reservas activas.</p>
        ) : reservasFiltradas.length === 0 ? (
          <p className="text-gray-500 text-sm">No se encontraron resultados.</p>
        ) : (
          <ul className="divide-y divide-gray-200 border rounded-lg">
            {reservasFiltradas.map((reserva) =>
              editingId === reserva.id ? (
                <li key={reserva.id} className="p-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label htmlFor={`editNombre-${reserva.id}`} className="block text-xs text-gray-600">Nombre:</label>
                      <input
                        type="text"
                        id={`editNombre-${reserva.id}`}
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`editTelefono-${reserva.id}`} className="block text-xs text-gray-600">Teléfono:</label>
                      <input
                        type="text"
                        id={`editTelefono-${reserva.id}`}
                        value={editTelefono}
                        onChange={(e) => setEditTelefono(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`editEmail-${reserva.id}`} className="block text-xs text-gray-600">Email:</label>
                      <input
                        type="email"
                        id={`editEmail-${reserva.id}`}
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div />
                    <div>
                      <label htmlFor={`editInicio-${reserva.id}`} className="block text-xs text-gray-600">Desde:</label>
                      <input
                        type="date"
                        id={`editInicio-${reserva.id}`}
                        value={editInicio}
                        onChange={(e) => setEditInicio(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`editFin-${reserva.id}`} className="block text-xs text-gray-600">Hasta:</label>
                      <input
                        type="date"
                        id={`editFin-${reserva.id}`}
                        value={editFin}
                        onChange={(e) => setEditFin(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor={`editNotas-${reserva.id}`} className="block text-xs text-gray-600">Notas:</label>
                      <textarea
                        id={`editNotas-${reserva.id}`}
                        value={editNotas}
                        onChange={(e) => setEditNotas(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleGuardarEdicion(reserva)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelarEdicion}
                    className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-400 transition text-sm ml-2"
                  >
                    Cancelar edición
                  </button>
                </li>
              ) : (
                <li key={reserva.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">
                      {reserva.cliente_nombre} · {reserva.articulos?.nombre ?? '—'}
                    </p>
                    <p className="text-gray-500">
                      📞 {reserva.cliente_telefono} · 📅 {reserva.fecha_inicio} → {reserva.fecha_fin} · {reserva.estado}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEmpezarEdicion(reserva)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleCancelarReserva(reserva.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
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

export default GestionarReservasModal
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors reported for `src/components/GestionarReservasModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/GestionarReservasModal.tsx
git commit -m "feat: add GestionarReservasModal for editing and cancelling reservations"
```

---

### Task 7: Wire GestionarReservasModal into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `GestionarReservasModal` (Task 6).
- Produces: the fully wired app — no later task depends on this.

- [ ] **Step 1: Add the import and state**

In `src/App.tsx`, add this import after the `ReservationHistory` import (after line 7):

```tsx
import GestionarReservasModal from './components/GestionarReservasModal'
```

Add this state declaration after `modalArticuloOpen` (after line 15):

```tsx
  const [modalGestionarOpen, setModalGestionarOpen] = useState(false)
```

- [ ] **Step 2: Add the header button**

Insert this button between the "📅 Nueva Reserva" button (ends at line 66) and the "📋 Historial" button (starts at line 67):

```tsx
              <button
                onClick={() => setModalGestionarOpen(true)}
                className="bg-indigo-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-indigo-700 transition"
              >
                📝 Gestionar Reservas
              </button>
```

- [ ] **Step 3: Render the modal**

Insert this block after the `ManageArticleModal` render block (after line 115, before the `{modalReservaOpen && (...)}` block):

```tsx
      {modalGestionarOpen && (
        <GestionarReservasModal
          isOpen={modalGestionarOpen}
          onClose={() => setModalGestionarOpen(false)}
          onReservasChanged={handleDataChanged}
        />
      )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors project-wide.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Gestionar Reservas button and modal into App"
```

---

### Task 8: DB-level exclusion constraint SQL document

**Files:**
- Create: `docs/supabase-exclusion-constraint.sql`

**Interfaces:**
- Consumes: nothing — this is a standalone SQL file for manual, out-of-band application by the user in the Supabase SQL editor. Not executed by any part of this codebase or this plan.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Create the file**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/supabase-exclusion-constraint.sql
git commit -m "docs: add DB-level exclusion constraint SQL for manual application in Supabase"
```

---

### Task 9: Final verification

**Files:** None (verification only).

**Interfaces:** N/A — this task verifies the combined output of Tasks 1-8.

- [ ] **Step 1: Full project typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds, emits `dist/` with a real compiled CSS file (not just raw `@tailwind` directives — this project has a known history of that regressing silently, see the previous plan's Task 9).

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev` and drive the app in a real browser. Walk through, in order:

1. Confirm the calendar's day-column headers show only numbers (no weekday letters), and that the header row shows Spanish month name, "Hoy", and "Mes" (not "today"/"month").
2. Click "📅 Nueva Reserva" in the header (standalone mode — no calendar cell pre-selected). Create a reservation for a specific article and date range. Confirm it saves.
3. Click "📅 Nueva Reserva" again, pick the SAME article and an overlapping date range as the reservation just created. Confirm submission is blocked with the error "Ya existe una reserva para ese artículo en esas fechas." and nothing is saved.
4. Try submitting either reservation form with an end date before the start date. Confirm it's blocked with "La fecha de inicio no puede ser posterior a la fecha de fin."
5. Click the new "📝 Gestionar Reservas" button. Confirm it lists the active reservation(s) created above (not cancelled ones). Use the search box to filter by the client's name, then by phone number, and confirm the list narrows correctly.
6. Click "✏️ Editar" on a reservation, change its phone number and date range to a new non-overlapping range, save. Confirm the change appears immediately in the list, and that the calendar (close the modal and check) reflects the new dates.
7. Click "❌ Cancelar" on a reservation from Gestionar Reservas. Confirm it disappears from the Gestionar Reservas list and the calendar cell for its dates turns green again.
8. Open "📋 Historial", confirm the search box there also filters correctly by name/phone.
9. Open an article's detail modal from the calendar, try creating a bloqueo with an end date before the start date, confirm it's blocked with the same date-order error message.

If any step fails, treat it as a bug in the task that owns the affected file — fix there, re-run the relevant typecheck, and re-verify this checklist from that step onward.

---

## Final Self-Review Notes

- **Spec coverage:** All 6 numbered sections of the design spec map to tasks: §1 (calendar locale/format) → Task 1; §2 (overlap protection) → Tasks 2, 3, 6; §3 (Gestionar Reservas) → Tasks 6, 7; §4 (date-order validation) → Tasks 3, 4, 6; §5 (search) → Tasks 5, 6; §6 (DB constraint SQL) → Task 8.
- **Type consistency:** `hayConflictoReserva` and `updateReserva` are defined once in Task 2 and consumed with matching signatures in Tasks 3 and 6. `ReservaConArticulo` (from Task 6's perspective) is the pre-existing type from `src/types.ts` — no new types introduced, no drift.
- **No placeholders:** every step contains complete, runnable code.
