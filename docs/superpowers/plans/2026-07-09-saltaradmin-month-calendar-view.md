# SaltarAdmin Month Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Calendario" navigation tab showing a monthly day-number calendar; clicking a day opens a read-only floating window listing every active reservation for that day, across all articles.

**Architecture:** Two new self-contained React components (`DayReservationsModal`, `MonthCalendarView`) plus a small refactor of `App.tsx`'s view-switching state from a boolean to a 3-way union type. `MonthCalendarView` wraps FullCalendar's `dayGridMonth` view (plugin already installed, unused until now) and fetches reservations client-side with the existing `getReservas()` call — no new Supabase functions needed.

**Tech Stack:** React 18 + TypeScript (strict), `@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/interaction` (all already in `package.json`), Tailwind CSS.

## Global Constraints

- No new npm dependencies. `@fullcalendar/daygrid` and `@fullcalendar/interaction` are already listed in `package.json` (`^6.1.21`) but `daygrid` is not imported anywhere yet.
- Reuse the Spanish locale exactly as `src/components/Calendar.tsx` does: `import esLocale from '@fullcalendar/core/locales/es'`.
- Date-range convention used everywhere in this app is the half-open interval `[fecha_inicio, fecha_fin)`: a day `D` belongs to a reservation when `fecha_inicio <= D && D < fecha_fin`. Do not use `<=` on `fecha_fin`.
- This project has no automated test framework (no `test` script in `package.json`, no jest/vitest/playwright-test installed as a dependency). The verification method for every task is: (1) `npx tsc -p tsconfig.json --noEmit` must report zero errors, and (2) a manual live check using the Playwright MCP browser tools already available in this environment. This view requires no Clerk login (same as the existing Dashboard calendar), so it can be fully driven live.
- Every modal in this app closes two ways: clicking the X button (`aria-label="Cerrar"`) and clicking the dark backdrop outside the card. Pattern (copy exactly, see `src/components/ArticleDetailModal.tsx` for the closest existing example):
  ```tsx
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">...</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">✕</button>
      </div>
      ...
    </div>
  </div>
  ```
- Dates shown to the user always go through `formatFecha()` from `src/lib/format.ts` (converts `YYYY-MM-DD` to `dd-mm-yyyy`). Internal state and Supabase reads/writes stay in `YYYY-MM-DD`.
- No visual indicators (dots, badges, counts) on calendar day cells — explicitly out of scope per the approved design.
- `DayReservationsModal` is read-only: no edit/cancel buttons, no click behavior on individual reservation rows.
- Cancelled reservations (`estado === 'cancelada'`) are excluded from the day list.

---

### Task 1: DayReservationsModal component

**Files:**
- Create: `src/components/DayReservationsModal.tsx`

**Interfaces:**
- Consumes: `formatFecha(fecha: string): string` from `src/lib/format.ts` (existing); `ReservaConArticulo` type from `src/types.ts` (existing — has `cliente_nombre`, `cliente_telefono`, `cliente_email: string | null`, `fecha_inicio`, `fecha_fin`, `estado: ReservaEstado`, `notas: string | null`, `articulos: { nombre: string } | null`).
- Produces: default export `DayReservationsModal: React.FC<DayReservationsModalProps>` where
  ```ts
  interface DayReservationsModalProps {
    isOpen: boolean
    onClose: () => void
    fecha: string // 'YYYY-MM-DD'
    reservas: ReservaConArticulo[] // already filtered for this day by the caller
  }
  ```
  Task 2 imports this component and this exact prop shape.

- [ ] **Step 1: Create the component**

Write `src/components/DayReservationsModal.tsx`:

```tsx
import React from 'react'
import { formatFecha } from '../lib/format'
import type { ReservaConArticulo } from '../types'

interface DayReservationsModalProps {
  isOpen: boolean
  onClose: () => void
  fecha: string
  reservas: ReservaConArticulo[]
}

const DayReservationsModal: React.FC<DayReservationsModalProps> = ({ isOpen, onClose, fecha, reservas }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📅 {formatFecha(fecha)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {reservas.length === 0 ? (
          <p className="text-gray-500 text-sm mb-4">No hay reservas este día.</p>
        ) : (
          <ul className="mb-4 divide-y divide-gray-200 border rounded-lg">
            {reservas.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <p className="font-medium text-gray-800">
                  {r.cliente_nombre} · {r.articulos?.nombre ?? '—'}
                </p>
                <p className="text-gray-500">📞 {r.cliente_telefono}</p>
                {r.cliente_email && <p className="text-gray-500">✉️ {r.cliente_email}</p>}
                <p className="text-gray-500">
                  📅 {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                </p>
                <p className="text-gray-500 capitalize">Estado: {r.estado}</p>
                {r.notas && <p className="text-gray-500">📝 {r.notas}</p>}
              </li>
            ))}
          </ul>
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

export default DayReservationsModal
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors (this file is valid standalone TypeScript even though nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/DayReservationsModal.tsx
git commit -m "feat: add read-only DayReservationsModal component"
```

---

### Task 2: MonthCalendarView component

**Files:**
- Create: `src/components/MonthCalendarView.tsx`

**Interfaces:**
- Consumes: `getReservas(): Promise<ReservaConArticulo[]>` from `src/lib/supabase.ts` (existing, no args, returns all reservations with `articulos.nombre` joined); `DayReservationsModal` from Task 1 with the exact prop shape `{ isOpen, onClose, fecha, reservas }`; `DateClickArg` type from `@fullcalendar/interaction` (has `.dateStr: string`, `YYYY-MM-DD` format for all-day month-grid clicks).
- Produces: default export `MonthCalendarView: React.FC` (no props — fully self-contained). Task 3 imports this component and renders it with no props, same as it renders `<ReservationHistory />`.

- [ ] **Step 1: Create the component**

Write `src/components/MonthCalendarView.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { getReservas } from '../lib/supabase'
import DayReservationsModal from './DayReservationsModal'
import type { ReservaConArticulo } from '../types'

const MonthCalendarView: React.FC = () => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getReservas()
        setReservas(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDateClick = (info: DateClickArg) => {
    setFechaSeleccionada(info.dateStr)
  }

  const reservasDelDia = fechaSeleccionada
    ? reservas.filter(
        (r) => r.estado !== 'cancelada' && r.fecha_inicio <= fechaSeleccionada && fechaSeleccionada < r.fecha_fin
      )
    : []

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg relative">
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        height="auto"
        dateClick={handleDateClick}
      />

      {fechaSeleccionada && (
        <DayReservationsModal
          isOpen={!!fechaSeleccionada}
          onClose={() => setFechaSeleccionada(null)}
          fecha={fechaSeleccionada}
          reservas={reservasDelDia}
        />
      )}
    </div>
  )
}

export default MonthCalendarView
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MonthCalendarView.tsx
git commit -m "feat: add MonthCalendarView with day-click reservation lookup"
```

---

### Task 3: Wire "Calendario" tab into App.tsx navigation

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `MonthCalendarView` default export from Task 2 (no props).

- [ ] **Step 1: Replace the `showHistorial` boolean with a `Vista` union type**

In `src/App.tsx`, add the import and replace the state declaration:

```tsx
// Old (line 1-9 imports):
import React, { useState } from 'react'
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react'
import Calendar from './components/Calendar'
import ManageArticleModal from './components/ManageArticleModal'
import ArticleDetailModal from './components/ArticleDetailModal'
import ReserveModal from './components/ReserveModal'
import ReservationHistory from './components/ReservationHistory'
import GestionarReservasModal from './components/GestionarReservasModal'
import { getArticulos } from './lib/supabase'
import type { Articulo } from './types'
```

becomes:

```tsx
import React, { useState } from 'react'
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react'
import Calendar from './components/Calendar'
import MonthCalendarView from './components/MonthCalendarView'
import ManageArticleModal from './components/ManageArticleModal'
import ArticleDetailModal from './components/ArticleDetailModal'
import ReserveModal from './components/ReserveModal'
import ReservationHistory from './components/ReservationHistory'
import GestionarReservasModal from './components/GestionarReservasModal'
import { getArticulos } from './lib/supabase'
import type { Articulo } from './types'

type Vista = 'dashboard' | 'calendario' | 'historial'
```

Old:
```tsx
  const { isSignedIn } = useAuth()
  const [showHistorial, setShowHistorial] = useState(false)
```

New:
```tsx
  const { isSignedIn } = useAuth()
  const [vista, setVista] = useState<Vista>('dashboard')
```

- [ ] **Step 2: Update `handleNuevaReservaClick`**

Old:
```tsx
  const handleNuevaReservaClick = () => {
    setShowHistorial(false)
    setSelectedArticuloId('')
```

New:
```tsx
  const handleNuevaReservaClick = () => {
    setVista('dashboard')
    setSelectedArticuloId('')
```

- [ ] **Step 3: Update the title and nav buttons**

Old:
```tsx
        <h1
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => setShowHistorial(false)}
        >
          🗄️ SaltarAdmin
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isSignedIn ? (
            <>
              <button
                onClick={() => setShowHistorial(false)}
                className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition"
              >
                🏠 Dashboard
              </button>
              <button
                onClick={handleNuevaReservaClick}
                className="bg-green-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-green-700 transition"
              >
                📅 Nueva Reserva
              </button>
              <button
                onClick={() => setModalGestionarOpen(true)}
                className="bg-indigo-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-indigo-700 transition"
              >
                📝 Gestionar Reservas
              </button>
              <button
                onClick={() => setShowHistorial((prev) => !prev)}
                className="bg-blue-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-blue-700 transition"
              >
                📋 Historial
              </button>
```

New:
```tsx
        <h1
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => setVista('dashboard')}
        >
          🗄️ SaltarAdmin
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isSignedIn ? (
            <>
              <button
                onClick={() => setVista('dashboard')}
                className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition"
              >
                🏠 Dashboard
              </button>
              <button
                onClick={() => setVista('calendario')}
                className="bg-teal-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-teal-700 transition"
              >
                📆 Calendario
              </button>
              <button
                onClick={handleNuevaReservaClick}
                className="bg-green-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-green-700 transition"
              >
                📅 Nueva Reserva
              </button>
              <button
                onClick={() => setModalGestionarOpen(true)}
                className="bg-indigo-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-indigo-700 transition"
              >
                📝 Gestionar Reservas
              </button>
              <button
                onClick={() => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial'))}
                className="bg-blue-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-blue-700 transition"
              >
                📋 Historial
              </button>
```

- [ ] **Step 4: Update the main view switch**

Old:
```tsx
        {showHistorial ? (
          <ReservationHistory key={`historial-${refreshKey}`} />
        ) : (
          <Calendar
            key={`calendario-${refreshKey}`}
            onCeldaClick={handleCeldaClick}
            onArticuloClick={handleArticuloClick}
          />
        )}
```

New:
```tsx
        {vista === 'historial' ? (
          <ReservationHistory key={`historial-${refreshKey}`} />
        ) : vista === 'calendario' ? (
          <MonthCalendarView key={`mes-${refreshKey}`} />
        ) : (
          <Calendar
            key={`calendario-${refreshKey}`}
            onCeldaClick={handleCeldaClick}
            onArticuloClick={handleArticuloClick}
          />
        )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors. In particular, confirm there are no remaining references to `showHistorial` or `setShowHistorial` anywhere in the file (both were fully replaced by `vista`/`setVista`).

- [ ] **Step 6: Manual live verification with Playwright**

This view has no Clerk login gate (same as the existing Dashboard), so drive it directly:

1. Start the dev server (`npm run dev`) and navigate to it.
2. Click "📆 Calendario" in the nav → confirm the month grid renders with day numbers only (no events drawn on cells) and the title shows "Julio de 2026" (capitalized, via the existing `.fc-toolbar-title::first-letter` CSS rule).
3. Click a day that has at least one active (non-cancelled) reservation (cross-check against a known reservation from earlier live testing, or create one via "📅 Nueva Reserva" first) → confirm `DayReservationsModal` opens showing that reservation's client name, article, phone, dates (dd-mm-yyyy), estado, and notas if present.
4. Click a day with no reservations → confirm the modal opens showing "No hay reservas este día."
5. With the modal open, click the "✕" button → confirm it closes. Reopen, click the dark backdrop → confirm it closes.
6. Click "Mes siguiente" / "Mes anterior" (prev/next arrows) → confirm the title updates and the grid shows the correct days for that month.
7. Click "🏠 Dashboard" → confirm it returns to the existing resource-timeline view unchanged.
8. Click the "🗄️ SaltarAdmin" title while on the Calendario or Historial view → confirm it returns to Dashboard.
9. Clean up any test reservation created in step 3 via the Supabase REST API (same pattern used earlier this session), and remove any `.playwright-mcp/` artifacts generated during this check.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Calendario tab wiring MonthCalendarView into navigation"
```

---

## Post-implementation

After Task 3 is committed and verified, this plan is complete.
