# SaltarAdmin Navigation and Article Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Dashboard navigation button (plus a clickable app title), a hard-delete button for articles with confirmation and foreign-key-conflict handling, richer reservation popover content (email/notas), and a verified CSS fix so calendar events fully fill their cell.

**Architecture:** Small, independent, additive changes across the existing component set — no new components. `deleteArticulo` is a new one-line data-layer function consumed by `ManageArticleModal`. The other three changes (Dashboard nav, popover fields, CSS fix) touch different files and have no dependencies on each other.

**Tech Stack:** React 18, TypeScript (strict), Vite, Tailwind CSS, Supabase JS v2, FullCalendar v6.

## Global Constraints

- "Eliminar" an article means an actual hard delete (`DELETE FROM articulos`), not a soft-delete via `estado`. This is intentionally different from reservations, where "cancelar" is a soft-cancel — do not confuse the two mechanisms across files.
- Delete confirmation uses the browser's native `window.confirm(...)`, not a custom modal — this was an explicit, approved simplification.
- If deleting an article fails because it has associated reservas/bloqueos (Postgres foreign-key violation, error code `23503`), show: `No se puede eliminar: este artículo tiene reservas o bloqueos asociados. Cámbialo a estado "baja" en su lugar, o elimina primero sus reservas/bloqueos.` For any other error, use the existing generic-message pattern already used elsewhere in the file.
- The Dashboard button always sets `showHistorial` to `false` — it is NOT a toggle (unlike the existing Historial button, which flips state). The clickable app title does the same.
- The CSS fix values below were verified live in a browser against the actual rendered DOM before being written into this plan — apply them exactly as given, do not "simplify" or guess alternate values.
- No automated test framework exists in this project. Verification per task is `npx tsc -p tsconfig.json --noEmit` (must show zero new errors); the final task adds `npm run build` and a manual browser walkthrough.

---

### Task 1: Data layer — deleteArticulo

**Files:**
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 2): `deleteArticulo(id: string): Promise<void>`

- [ ] **Step 1: Add the function**

In `src/lib/supabase.ts`, insert this immediately after the existing `updateArticuloEstado` function (after line 51), before the `// Reservas` comment:

```ts
export const deleteArticulo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('articulos').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add deleteArticulo to data layer"
```

---

### Task 2: ManageArticleModal — delete button with confirmation and FK handling

**Files:**
- Modify: `src/components/ManageArticleModal.tsx`

**Interfaces:**
- Consumes: `deleteArticulo` from `src/lib/supabase.ts` (Task 1).
- Produces: no prop changes — `ManageArticleModalProps` is unchanged.

- [ ] **Step 1: Update the import**

Change line 2 from:

```tsx
import { createArticulo, getArticulos, updateArticuloEstado } from '../lib/supabase'
```

to:

```tsx
import { createArticulo, deleteArticulo, getArticulos, updateArticuloEstado } from '../lib/supabase'
```

- [ ] **Step 2: Add the delete handler**

Insert this function immediately after `handleEstadoChange` (after line 74, before the `return (` on line 76):

```tsx
  const handleEliminarArticulo = async (id: string, nombre: string) => {
    const confirmado = window.confirm(
      `¿Seguro que quieres eliminar "${nombre}" permanentemente? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    setError(null)
    try {
      await deleteArticulo(id)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23503') {
        setError(
          'No se puede eliminar: este artículo tiene reservas o bloqueos asociados. Cámbialo a estado "baja" en su lugar, o elimina primero sus reservas/bloqueos.'
        )
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el artículo.')
      }
    }
  }
```

- [ ] **Step 3: Add the delete button to each article row**

Replace the `articulos.map((a) => (...))` block (lines 92-109) with:

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

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ManageArticleModal.tsx
git commit -m "feat: add delete button with confirmation and FK-conflict handling to ManageArticleModal"
```

---

### Task 3: App.tsx — Dashboard button and clickable title

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no prop changes.

- [ ] **Step 1: Make the title clickable**

Replace line 59:

```tsx
        <h1 className="text-2xl font-bold text-white">🗄️ SaltarAdmin</h1>
```

with:

```tsx
        <h1
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => setShowHistorial(false)}
        >
          🗄️ SaltarAdmin
        </h1>
```

- [ ] **Step 2: Add the Dashboard button**

Insert this button as the FIRST button inside the `<>` fragment (before the existing "📅 Nueva Reserva" button, which starts at line 63):

```tsx
              <button
                onClick={() => setShowHistorial(false)}
                className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition"
              >
                🏠 Dashboard
              </button>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Dashboard button and clickable app title"
```

---

### Task 4: Calendar — show email and notas in the reservation popover

**Files:**
- Modify: `src/components/Calendar.tsx`

**Interfaces:**
- Consumes: nothing new (`ReservaConArticulo`/`Reserva` already include `cliente_email: string | null` and `notas: string | null`).
- Produces: no prop changes.

- [ ] **Step 1: Add the email line**

In the popover JSX, insert this immediately after the `cliente_telefono` paragraph (after line 143, before the `📅` fechas paragraph on line 144):

```tsx
            {popover.reserva.cliente_email && (
              <p className="text-sm text-gray-600">✉️ {popover.reserva.cliente_email}</p>
            )}
```

- [ ] **Step 2: Add the notas block**

Insert this immediately after the `Estado:` paragraph (after line 147, before the closing `</div>` on line 148):

```tsx
            {popover.reserva.notas && (
              <p className="text-sm text-gray-600 mt-2 border-t pt-2">📝 {popover.reserva.notas}</p>
            )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: show email and notas in the reservation popover"
```

---

### Task 5: index.css — make calendar events fully fill their cell

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by other tasks — pure visual fix.

**Context for the implementer:** this CSS was derived by live-inspecting the actual rendered DOM in a browser, not guessed. Root cause: FullCalendar's `.fc-timeline-events` container has `padding-bottom: 10px` with `box-sizing: content-box`, which adds 10px of space OUTSIDE the height FullCalendar assigns it dynamically — that extra space was visible as green background around/below the red event block. A 1px `margin` on the event itself also left a thin green line on two edges. Apply exactly the rule below; do not substitute alternate property values.

- [ ] **Step 1: Add the CSS rule**

Append this to the end of `src/index.css` (after the existing `.fc-available-lane` rule, which ends at line 18):

```css

/* Los eventos (reservas/bloqueos) no rellenaban por completo su celda:
   .fc-timeline-events tiene padding-bottom con box-sizing: content-box,
   que añade espacio fuera de la altura que FullCalendar le fija
   dinámicamente. Verificado en el DOM real: con este ajuste la altura
   del evento coincide exactamente con la altura de su fila. */
.fc-timeline-events {
  height: 100% !important;
  box-sizing: border-box !important;
}
.fc-timeline-event-harness {
  top: 0 !important;
  bottom: 0 !important;
  height: auto !important;
}
.fc-timeline-event {
  height: 100% !important;
  margin: 0 !important;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors (this task touches no `.ts`/`.tsx` files, so this just confirms no regression).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix: make calendar events fully fill their resource-row cell"
```

---

### Task 6: Final verification

**Files:** None (verification only).

**Interfaces:** N/A — this task verifies the combined output of Tasks 1-5.

- [ ] **Step 1: Full project typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: zero errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds, emits `dist/` with a real compiled CSS file containing the new `.fc-timeline-events`/`.fc-timeline-event-harness`/`.fc-timeline-event` rules (not just raw `@tailwind` directives — this project has a known history of that regressing silently).

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev` and drive the app in a real browser. Walk through, in order:

1. From the calendar (default view), click "📋 Historial" to switch to the history table. Click "🏠 Dashboard" — confirm it returns to the calendar. Click "Historial" again, then click the "🗄️ SaltarAdmin" title — confirm it also returns to the calendar.
2. Open "⚙️ Gestionar Artículos". Confirm each row now shows a "🗑️ Eliminar" button next to (not inside) the estado `<select>`. Click it on an article that has no reservations or bloqueos, confirm the native browser confirmation dialog appears, confirm it, and confirm the article disappears from the list and from the calendar.
3. Click "🗑️ Eliminar" on an article that HAS at least one reservation or bloqueo (create one first via the calendar if none exist), confirm the dialog, and confirm it is NOT deleted — instead the error "No se puede eliminar: este artículo tiene reservas o bloqueos asociados..." appears.
4. Click a red reservation event on the calendar that has an email and notas set (create one via "📅 Nueva Reserva" with those fields filled if none exist). Confirm the popover now shows the email (✉️) and notas (📝) in addition to name/phone/dates/estado. Click one with no email/notas and confirm those lines are simply absent (no empty rows).
5. Visually inspect the calendar: confirm every reservation (red) and bloqueo (gray) block fully fills its cell with no green background visible around or inside its edges, at various zoom levels / after resizing the browser window.

If any step fails, treat it as a bug in the task that owns the affected file — fix there, re-run the relevant typecheck, and re-verify this checklist from that step onward.

---

## Final Self-Review Notes

- **Spec coverage:** All 4 numbered sections of the design spec map to tasks: §1 (Dashboard nav) → Task 3; §2 (delete article) → Tasks 1-2; §3 (popover email/notas) → Task 4; §4 (event fill CSS) → Task 5.
- **Type consistency:** `deleteArticulo(id: string): Promise<void>` defined once in Task 1, consumed with matching signature in Task 2. No new types introduced elsewhere.
- **No placeholders:** every step contains complete, runnable code — the CSS in Task 5 is the exact, already browser-verified rule set, not a placeholder to be figured out later.
