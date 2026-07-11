# SaltarAdmin Mobile Responsive Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SaltarAdmin usable on a mobile viewport (~390px wide): collapsible nav, a Dashboard calendar view that fits the screen, single-column forms, stacked list rows, adequate touch targets, and a couple of small safety/polish fixes (backdrop-close confirmation, off-screen popover clamping, "Sign in" contrast).

**Architecture:** Eleven mechanical/moderate Tailwind and React changes spread across 7 files, one task per file. Every change uses Tailwind's default `sm:`/`md:` breakpoints (already configured, unused until now) — no new dependencies, no new breakpoints to define.

**Tech Stack:** React 18 + TypeScript (strict), Tailwind CSS (default breakpoints), `@fullcalendar/resource-timeline` (already installed — `resourceTimelineWeek`/`resourceTimelineDay` ship in the same plugin as `resourceTimelineMonth`, no new import needed).

## Global Constraints

- No new npm dependencies.
- Tailwind's default breakpoints are used as-is: `sm:` = 640px, `md:` = 768px. Do not add custom breakpoints to `tailwind.config.js`.
- This project has no automated test framework (no `test` script in `package.json`, no jest/vitest). Verification for every task is: (1) `npx tsc -p tsconfig.json --noEmit` zero errors, and (2) manual live verification with the Playwright MCP browser tools, at both a mobile viewport (390×844) and a desktop-ish width (e.g. 1024×800, to confirm nothing regressed) — resize the browser between checks rather than relying on one width alone.
- The calendar's green/red colors (`#22c55e`/`#ef4444` in `src/index.css`) are explicitly OUT OF SCOPE for this plan — do not touch them.
- Modals in this app already close two ways: X button and backdrop click (`onClick={onClose}` on the outer `fixed inset-0` div). This plan changes the backdrop handler in 4 of the 5 modals to a `handleBackdropClick` function that asks for confirmation first if the form has unsaved content, then calls `onClose()`. The X button and any other explicit "Cerrar" button are NOT changed — they keep closing immediately without confirmation (only the accidental-tap backdrop path gets the guard).
- Several modals (`ManageArticleModal`, `GestionarReservasModal`) are reachable only when signed in via Clerk (`isSignedIn` gates the nav buttons in `src/App.tsx`), and this environment has no test credentials. To live-verify tasks touching those modals, temporarily edit `src/App.tsx`'s signed-in nav condition to force it true (e.g. `{isSignedIn ? (` → `{true || isSignedIn ? (`), test, then revert that single line exactly before the task's final `tsc` run and commit — confirm the revert with `git diff src/App.tsx` (must be empty, or contain only that task's own intended nav changes if the task IS App.tsx). Do not commit the bypass. `ArticleDetailModal` and the Dashboard/Calendario views are NOT login-gated (reached via clicking an article name, or the nav itself once Task 1 lands) — no bypass needed for those once Task 1 is merged; before Task 1 lands, the whole nav is still gated the same old way.
- Clean up any `.playwright-mcp/` directories or screenshot files created during live verification before committing, and stop any dev server you started.

---

### Task 1: Collapsible mobile nav (App.tsx)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- No new exports. Internal-only change to the `App` component.

- [ ] **Step 1: Add `menuAbierto` state**

Change:
```tsx
function App() {
  const { isSignedIn } = useAuth()
  const [vista, setVista] = useState<Vista>('dashboard')
  const [modalReservaOpen, setModalReservaOpen] = useState(false)
```

to:
```tsx
function App() {
  const { isSignedIn } = useAuth()
  const [vista, setVista] = useState<Vista>('dashboard')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [modalReservaOpen, setModalReservaOpen] = useState(false)
```

- [ ] **Step 2: Define a `navButtons` config array**

Change:
```tsx
  const handleDataChanged = () => setRefreshKey((prev) => prev + 1)

  return (
```

to:
```tsx
  const handleDataChanged = () => setRefreshKey((prev) => prev + 1)

  const navButtons: { label: string; onClick: () => void; className: string }[] = [
    { label: '🏠 Dashboard', onClick: () => setVista('dashboard'), className: 'bg-white text-gray-800 hover:bg-gray-100' },
    { label: '📆 Calendario', onClick: () => setVista('calendario'), className: 'bg-teal-600 text-white hover:bg-teal-700' },
    { label: '📅 Nueva Reserva', onClick: handleNuevaReservaClick, className: 'bg-green-600 text-white hover:bg-green-700' },
    { label: '📝 Gestionar Reservas', onClick: () => setModalGestionarOpen(true), className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
    { label: '📋 Historial', onClick: () => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial')), className: 'bg-blue-600 text-white hover:bg-blue-700' },
    { label: '⚙️ Gestionar Artículos', onClick: () => setModalArticuloOpen(true), className: 'bg-gray-600 text-white hover:bg-gray-700' },
  ]

  return (
```

- [ ] **Step 3: Replace the nav JSX**

Change:
```tsx
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
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
```

to:
```tsx
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
        <h1
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => setVista('dashboard')}
        >
          🗄️ SaltarAdmin
        </h1>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              <div className="hidden md:flex flex-wrap gap-2 items-center">
                {navButtons.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`${btn.className} px-5 py-2.5 text-lg rounded-lg transition`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="md:hidden bg-white text-gray-800 px-4 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition"
                aria-label="Menú"
              >
                ☰
              </button>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
        {isSignedIn && menuAbierto && (
          <div className="md:hidden w-full flex flex-col gap-2">
            {navButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => {
                  btn.onClick()
                  setMenuAbierto(false)
                }}
                className={`${btn.className} px-5 py-2.5 text-lg rounded-lg transition w-full text-left`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </nav>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual live verification with Playwright**

This is the file that gates every other login-required modal, so verify it directly (no bypass needed to see the signed-out state; use the bypass technique from Global Constraints to see the signed-in nav):

1. At 390×844, signed out: confirm only "🗄️ SaltarAdmin" and the "Sign in" pill button show, no hamburger.
2. Apply the temporary signed-in bypass. At 390×844: confirm only the hamburger (☰) and the user avatar show — no wrapped button wall. Click the hamburger → confirm the 6 buttons appear stacked full-width below the header. Click "📆 Calendario" → confirm it navigates AND the menu closes automatically.
3. Reopen the hamburger menu, click the backdrop-less area outside the menu (e.g. click "🗄️ SaltarAdmin" title) — this is a separate control, not required to close the menu; just confirm nothing crashes.
4. Resize to 1024×800 (desktop): confirm the hamburger disappears and the original horizontal 6-button row reappears, unchanged from before this task.
5. Revert the temporary bypass exactly (`git diff src/App.tsx` must show only this task's own intended changes, nothing else), stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: collapsible hamburger nav for mobile, styled Sign in button"
```

---

### Task 2: Dashboard responsive FullCalendar view + popover clamping (Calendar.tsx)

**Files:**
- Modify: `src/components/Calendar.tsx`

**Interfaces:**
- No new exports. Internal-only change to the `Calendar` component. Uses `resourceTimelineWeek`, a view already provided by the `resourceTimelinePlugin` already imported in this file — no new plugin import.

- [ ] **Step 1: Add a calendar ref and a responsive view-switch effect**

Change:
```tsx
const Calendar: React.FC<CalendarProps> = ({ onCeldaClick, onArticuloClick }) => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [popover, setPopover] = useState<ReservaPopoverState | null>(null)

  const onArticuloClickRef = useRef(onArticuloClick)
  useEffect(() => {
    onArticuloClickRef.current = onArticuloClick
  }, [onArticuloClick])
```

to:
```tsx
const Calendar: React.FC<CalendarProps> = ({ onCeldaClick, onArticuloClick }) => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [popover, setPopover] = useState<ReservaPopoverState | null>(null)
  const calendarRef = useRef<FullCalendar>(null)

  const onArticuloClickRef = useRef(onArticuloClick)
  useEffect(() => {
    onArticuloClickRef.current = onArticuloClick
  }, [onArticuloClick])

  useEffect(() => {
    const applyResponsiveView = () => {
      const api = calendarRef.current?.getApi()
      if (!api) return
      const isMobile = window.innerWidth < 768
      const targetView = isMobile ? 'resourceTimelineWeek' : 'resourceTimelineMonth'
      if (api.view.type !== targetView) {
        api.changeView(targetView)
      }
    }
    applyResponsiveView()
    window.addEventListener('resize', applyResponsiveView)
    return () => window.removeEventListener('resize', applyResponsiveView)
  }, [])
```

- [ ] **Step 2: Clamp the popover position to the viewport**

Change:
```tsx
  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.type === 'reserva') {
      const reserva = info.event.extendedProps.reserva as ReservaConArticulo
      setPopover({ x: info.jsEvent.pageX, y: info.jsEvent.pageY, reserva })
    }
  }
```

to:
```tsx
  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.type === 'reserva') {
      const reserva = info.event.extendedProps.reserva as ReservaConArticulo
      const popoverWidth = 256
      const x = Math.max(8, Math.min(info.jsEvent.pageX + 8, window.innerWidth - popoverWidth - 8))
      const y = Math.max(8, Math.min(info.jsEvent.pageY + 8, window.innerHeight - 8))
      setPopover({ x, y, reserva })
    }
  }
```

- [ ] **Step 3: Wire the ref into `<FullCalendar>` and drop the redundant "Mes" toolbar button**

Change:
```tsx
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
```

to:
```tsx
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineMonth"
        resources={resources}
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
```

- [ ] **Step 4: Simplify the popover's inline position style**

The `x`/`y` computed in Step 2 already include the `+8` offset, so the render no longer needs to add it again. Change:
```tsx
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64"
            style={{ top: popover.y + 8, left: popover.x + 8 }}
          >
```

to:
```tsx
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64"
            style={{ top: popover.y, left: popover.x }}
          >
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors. If `ref={calendarRef}` on `<FullCalendar>` produces a type error, confirm `calendarRef` is declared as `useRef<FullCalendar>(null)` (matching the imported `FullCalendar` component type from `@fullcalendar/react`) — this is the standard typing FullCalendar's React wrapper expects for `getApi()` access.

- [ ] **Step 6: Manual live verification with Playwright**

The Dashboard is not login-gated — no bypass needed.

1. At 1024×800 (desktop): confirm the Dashboard still shows `resourceTimelineMonth` (full month of day columns) exactly as before this task, and the toolbar no longer shows a "Mes" button on the right.
2. Resize to 390×844: confirm the view switches to a week-based timeline (7ish day columns instead of a full month) without a page reload — this should happen live via the resize listener. Confirm article rows and the green/red cell coloring still render correctly in the new view.
3. Click a reservation's red event block near the right edge of the viewport: confirm the popover renders fully on-screen (previously it could overflow past the right edge) — compare against clicking one near the left edge, which should behave as before.
4. Click an empty (green) cell in the mobile week view: confirm it still opens the reservation-creation flow (the `select` callback), same as in month view.
5. Resize back to 1024×800: confirm the view switches back to `resourceTimelineMonth`.
6. Stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 7: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: responsive Dashboard view + clamped popover + drop redundant Mes button"
```

---

### Task 3: ReserveModal mobile fixes (ReserveModal.tsx)

**Files:**
- Modify: `src/components/ReserveModal.tsx`

**Interfaces:**
- No new exports. Internal-only changes to the `ReserveModal` component.

- [ ] **Step 1: Add a `handleBackdropClick` guard**

Change:
```tsx
  const handleSubmit = async (e: React.FormEvent) => {
```

to:
```tsx
  const handleBackdropClick = () => {
    const sucio = clienteNombre.trim() !== '' || clienteTelefono.trim() !== '' || clienteEmail.trim() !== '' || notas.trim() !== ''
    if (sucio && !window.confirm('¿Descartar los cambios?')) return
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
```

- [ ] **Step 2: Use the guard on the backdrop, cap the modal height, and reduce mobile padding**

Change:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
```

to:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 3: Make the standalone-mode date grid single-column on mobile**

Change:
```tsx
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="formFechaInicio" className="block text-gray-700">Desde:</label>
```

to:
```tsx
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="formFechaInicio" className="block text-gray-700">Desde:</label>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual live verification with Playwright**

`ReserveModal` opens from clicking an available (green) Dashboard cell — not login-gated.

1. At 390×844: click a green cell to open the modal. Confirm the card no longer touches the viewport edges awkwardly (padding reduced) and, most importantly, confirm the modal has an internal scrollbar if content exceeds ~85% of viewport height rather than pushing "Crear Reserva" off-screen.
2. Type a value into "Nombre del Cliente", then click the dark backdrop outside the modal: confirm a browser confirm dialog appears ("¿Descartar los cambios?"). Dismiss/cancel it (accept staying open) and confirm the modal is still open with the typed value intact.
3. Clear the field (or open a fresh modal instance with nothing typed) and click the backdrop: confirm it closes immediately with no dialog.
4. Open "📅 Nueva Reserva" from the nav (standalone mode, requires the login bypass — apply it, test, revert exactly): at 390×844 confirm the "Desde"/"Hasta" date fields stack to one column instead of sitting side by side.
5. Resize to 1024×800 and reopen: confirm "Desde"/"Hasta" sit side by side again (2 columns), matching pre-task desktop behavior.
6. Stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReserveModal.tsx
git commit -m "feat: mobile-friendly ReserveModal (capped height, single-column dates, discard guard)"
```

---

### Task 4: GestionarReservasModal mobile fixes (GestionarReservasModal.tsx)

**Files:**
- Modify: `src/components/GestionarReservasModal.tsx`

**Interfaces:**
- No new exports. Internal-only changes to the `GestionarReservasModal` component.

- [ ] **Step 1: Add a `handleBackdropClick` guard**

Change:
```tsx
  const handleCancelarReserva = async (id: string) => {
```

to:
```tsx
  const handleBackdropClick = () => {
    if (editingId !== null && !window.confirm('¿Descartar los cambios?')) return
    onClose()
  }

  const handleCancelarReserva = async (id: string) => {
```

- [ ] **Step 2: Use the guard on the backdrop and reduce mobile padding**

Change:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

to:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 3: Make the edit-form grid single-column on mobile**

Change:
```tsx
                <li key={reserva.id} className="p-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
```

to:
```tsx
                <li key={reserva.id} className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
```

- [ ] **Step 4: Stack the read-only row on mobile, enlarge action-button touch targets**

Change:
```tsx
              ) : (
                <li key={reserva.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">
                      {reserva.cliente_nombre} · {reserva.articulos?.nombre ?? '—'}
                    </p>
                    <p className="text-gray-500">
                      📞 {reserva.cliente_telefono} · 📅 {formatFecha(reserva.fecha_inicio)} → {formatFecha(reserva.fecha_fin)} · {reserva.estado}
                    </p>
                    {reserva.notas && (
                      <p className="text-gray-500">📝 {reserva.notas}</p>
                    )}
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
```

to:
```tsx
              ) : (
                <li key={reserva.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">
                      {reserva.cliente_nombre} · {reserva.articulos?.nombre ?? '—'}
                    </p>
                    <p className="text-gray-500">
                      📞 {reserva.cliente_telefono} · 📅 {formatFecha(reserva.fecha_inicio)} → {formatFecha(reserva.fecha_fin)} · {reserva.estado}
                    </p>
                    {reserva.notas && (
                      <p className="text-gray-500">📝 {reserva.notas}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEmpezarEdicion(reserva)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleCancelarReserva(reserva.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </li>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual live verification with Playwright**

`GestionarReservasModal` is login-gated — apply the temporary bypass from Global Constraints, test, then revert exactly.

1. At 390×844: open "📝 Gestionar Reservas". Confirm each reservation row shows the info block full-width on top and the Editar/Cancelar buttons on their own row beneath it (not squeezed to the side), and confirm the row text no longer breaks one word per line.
2. Click "✏️ Editar" on a reservation: confirm the edit form's fields (Nombre, Teléfono, Email, Estado, Desde, Hasta) stack to a single column, and the Email field shows its full value without truncation.
3. With the edit form open (state `editingId` set), click the backdrop: confirm a confirm dialog appears; cancel it and confirm the form is still open and editable.
4. Click "Cancelar edición" (the existing in-form button, not the backdrop) to close the edit form normally, then click the backdrop with no edit open: confirm it closes immediately, no dialog.
5. Resize to 1024×800: confirm rows return to a single horizontal line (info + buttons side by side) and the edit form returns to 2 columns, matching pre-task desktop behavior.
6. Revert the bypass exactly, stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 7: Commit**

```bash
git add src/components/GestionarReservasModal.tsx
git commit -m "feat: mobile-friendly GestionarReservasModal (stacked rows, single-column edit form, discard guard)"
```

---

### Task 5: ManageArticleModal mobile fixes (ManageArticleModal.tsx)

**Files:**
- Modify: `src/components/ManageArticleModal.tsx`

**Interfaces:**
- No new exports. Internal-only changes to the `ManageArticleModal` component.

- [ ] **Step 1: Add a `handleBackdropClick` guard**

Change:
```tsx
  const handleEstadoChange = async (id: string, nuevoEstado: ArticuloEstado) => {
```

to:
```tsx
  const handleBackdropClick = () => {
    const sucio = showForm && nombre.trim() !== ''
    if (sucio && !window.confirm('¿Descartar los cambios?')) return
    onClose()
  }

  const handleEstadoChange = async (id: string, nuevoEstado: ArticuloEstado) => {
```

- [ ] **Step 2: Use the guard on the backdrop and reduce mobile padding**

Change:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

to:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 3: Stack article rows on mobile, restyle "Eliminar" as a proper button**

Change:
```tsx
              articulos.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-medium text-gray-800">{a.nombre}</p>
                    <p className="text-xs text-gray-500">{a.categoria}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => handleEliminarArticulo(a.id, a.nombre)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </li>
              ))
```

to:
```tsx
              articulos.map((a) => (
                <li key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2">
                  <div>
                    <p className="font-medium text-gray-800">{a.nombre}</p>
                    <p className="text-xs text-gray-500">{a.categoria}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => handleEliminarArticulo(a.id, a.nombre)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </li>
              ))
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual live verification with Playwright**

`ManageArticleModal` is login-gated — apply the temporary bypass from Global Constraints, test, then revert exactly.

1. At 390×844: open "⚙️ Gestionar Artículos". Confirm each row shows name/category on top and the estado select + "🗑️ Eliminar" button beneath it, with "Eliminar" now a solid red button rather than a bare text link.
2. Click "➕ Nuevo Artículo", type a value into "Nombre", then click the backdrop: confirm a confirm dialog appears; cancel it, confirm the form and typed value are still there.
3. Click "Cancelar" (the in-form button) to close normally, reopen the create form but leave "Nombre" empty, click the backdrop: confirm it closes immediately, no dialog.
4. Resize to 1024×800: confirm rows return to a single horizontal line, matching pre-task desktop behavior.
5. Revert the bypass exactly, stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 6: Commit**

```bash
git add src/components/ManageArticleModal.tsx
git commit -m "feat: mobile-friendly ManageArticleModal (stacked rows, solid delete button, discard guard)"
```

---

### Task 6: ArticleDetailModal mobile fixes (ArticleDetailModal.tsx)

**Files:**
- Modify: `src/components/ArticleDetailModal.tsx`

**Interfaces:**
- No new exports. Internal-only changes to the `ArticleDetailModal` component.

- [ ] **Step 1: Add a `handleBackdropClick` guard**

Change:
```tsx
  const handleEliminarBloqueo = async (id: string) => {
```

to:
```tsx
  const handleBackdropClick = () => {
    const sucio = nuevoInicio.trim() !== '' || nuevoFin.trim() !== '' || nuevoMotivo.trim() !== ''
    if (sucio && !window.confirm('¿Descartar los cambios?')) return
    onClose()
  }

  const handleEliminarBloqueo = async (id: string) => {
```

- [ ] **Step 2: Use the guard on the backdrop and reduce mobile padding**

Change:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

to:
```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 3: Stack bloqueo rows on mobile, restyle "Eliminar" as a proper button**

Change:
```tsx
                bloqueos.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      {formatFecha(b.fecha_inicio)} → {formatFecha(b.fecha_fin)} · {b.motivo}
                    </span>
                    <button onClick={() => handleEliminarBloqueo(b.id)} className="text-red-600 hover:text-red-800">
                      Eliminar
                    </button>
                  </li>
                ))
```

to:
```tsx
                bloqueos.map((b) => (
                  <li key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      {formatFecha(b.fecha_inicio)} → {formatFecha(b.fecha_fin)} · {b.motivo}
                    </span>
                    <button
                      onClick={() => handleEliminarBloqueo(b.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm self-start sm:self-auto"
                    >
                      Eliminar
                    </button>
                  </li>
                ))
```

- [ ] **Step 4: Make the "add bloqueo" form grid single-column on mobile**

Change:
```tsx
            <form onSubmit={handleCrearBloqueo} className="grid grid-cols-2 gap-2 mb-4">
```

to:
```tsx
            <form onSubmit={handleCrearBloqueo} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual live verification with Playwright**

`ArticleDetailModal` is NOT login-gated (opens by clicking an article's name in the Dashboard's resource list) — no bypass needed.

1. At 390×844: click an article name to open the modal. Confirm the reservation-history table still fits via its existing horizontal scroll wrapper (unchanged), and any bloqueo rows stack their date/motivo text above the "Eliminar" button.
2. Type a value into "Motivo" in the "Añadir Bloqueo" form, then click the backdrop: confirm a confirm dialog appears; cancel it, confirm the form and typed value are still there.
3. Clear the field (or reopen fresh) and click the backdrop: confirm it closes immediately, no dialog.
4. Confirm the "Desde"/"Hasta"/"Motivo" fields stack to a single column at 390×844.
5. Resize to 1024×800: confirm bloqueo rows return to one line and the form returns to 2 columns, matching pre-task desktop behavior.
6. Stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 7: Commit**

```bash
git add src/components/ArticleDetailModal.tsx
git commit -m "feat: mobile-friendly ArticleDetailModal (stacked bloqueo rows, single-column form, discard guard)"
```

---

### Task 7: DayReservationsModal mobile padding (DayReservationsModal.tsx)

**Files:**
- Modify: `src/components/DayReservationsModal.tsx`

**Interfaces:**
- No new exports. Internal-only change to the `DayReservationsModal` component. This modal has no form fields, so it gets no `handleBackdropClick` guard — only the padding fix.

- [ ] **Step 1: Reduce mobile padding**

Change:
```tsx
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

to:
```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual live verification with Playwright**

Reachable via the "📆 Calendario" tab, which is login-gated only through the nav (not the modal itself) — once Task 1 is merged the hamburger menu reaches it the same way the old nav did; apply the temporary bypass from Global Constraints if Task 1 isn't merged yet in your working copy, test, then revert exactly.

1. At 390×844: open Calendario, tap a day with a reservation. Confirm the modal card has less side padding than before (content sits closer to the edges but still readable) and everything else (list content, Cerrar button) is unchanged.
2. Stop the dev server, remove `.playwright-mcp/` artifacts.

- [ ] **Step 4: Commit**

```bash
git add src/components/DayReservationsModal.tsx
git commit -m "feat: reduce DayReservationsModal padding on mobile"
```

---

## Post-implementation

After Task 7 is committed and verified, this plan is complete — all 7 files now adapt to mobile viewports via Tailwind's existing `sm:`/`md:` breakpoints, with no new dependencies and no changes to desktop behavior at ≥768px (nav) / ≥640px (grids, padding) / ≥768px (Dashboard view).
