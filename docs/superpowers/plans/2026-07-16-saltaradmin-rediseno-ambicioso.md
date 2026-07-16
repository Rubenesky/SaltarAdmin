# Rediseño visual ambicioso (Swiss/Minimalista) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Este plan parte de `master` limpio** (la ronda anterior de recolor teal nunca se fusionó). No depende de ningún cambio previo.

**Goal:** Rediseño visual real (no solo de color) de SaltarAdmin: esquinas rectas, sin sombras decorativas, un único acento usado con moderación, nav oscuro con línea de acento, jerarquía tipográfica marcada — estilo "Minimalism & Swiss Style" tomado del catálogo de referencia consultado.

**Architecture:** Mismo enfoque que la ronda anterior (sustitución de clases sobre los componentes existentes, sin extraer componentes compartidos), pero con un conjunto de transformaciones más profundo: además de color/tipografía, cambian el radio de esquina, el tratamiento de sombra/elevación, y el estilo de los botones secundarios (de relleno a contorno).

**Tech Stack:** React + TypeScript, Tailwind CSS 3.4.

## Global Constraints

- Ningún cambio de comportamiento, lógica, o estructura de datos — solo clases CSS.
- No se extraen componentes compartidos (`<Modal>`, `<Button>`) — fuera de alcance.
- El nav sigue siendo horizontal — no se cambia a barra lateral (decisión explícita del usuario).
- La tipografía (Lexend/Source Sans 3) es la misma que ya se validó en la ronda anterior.
- **Patrones de sustitución que se repiten idénticos en varios archivos** (aplicar el mismo find/replace literal en cada uno donde aparezca):
  - `rounded-lg` → `rounded-none` (en botones, inputs, tarjetas, modales — en todo el proyecto, salvo que una task diga explícitamente lo contrario)
  - `focus:border-blue-500` → `focus:border-primary`
  - Botones "Cerrar"/"Cancelar" (relleno gris `bg-gray-200`/`bg-gray-300` + texto oscuro) → contorno: `border border-gray-900 text-gray-900 hover:bg-gray-100 bg-transparent` (mismo padding/tamaño que ya tenían, solo cambia el tratamiento relleno→contorno)
  - Botones de acción principal (`bg-green-600`/`bg-blue-600` con texto blanco) → `bg-primary hover:bg-primary/90` (color de marca, se mantiene el relleno — es el único uso permitido del acento)
  - Títulos de modal (`text-xl font-bold ... text-gray-800`) → `text-2xl font-heading font-bold ... text-gray-900`
  - Botones/badges destructivos (`bg-red-600`) — **sin cambio de color**, solo pierden el `rounded-lg` (pasan a `rounded-none`) como el resto.

---

### Task 1: Tokens de diseño (Tailwind, fuentes, CSS del calendario)

**Files:**
- Modify: `tailwind.config.js`
- Modify: `index.html`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `bg-primary`, `text-primary`, `border-primary`, `bg-accent`, `bg-warning`, `font-heading` disponibles para las siguientes tasks.

- [ ] **Step 1: Reemplazar `tailwind.config.js` completo**

```js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Source Sans 3', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Lexend', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#0F766E',
        accent: '#0369A1',
        success: '#16a34a',
        danger: '#dc2626',
        warning: '#d97706',
        'light-gray': '#f3f4f6',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Actualizar la fuente en `index.html`**

Reemplazar la línea 9:

```html
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

por:

```html
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Actualizar `src/index.css`**

Reemplazar la línea 7:

```css
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
```

por:

```css
  font-family: 'Source Sans 3', ui-sans-serif, system-ui, sans-serif;
```

Reemplazar las líneas 17-18:

```css
.fc-available-lane {
  background-color: #4ade80;
}
```

por:

```css
.fc-available-lane {
  background-color: #5eead4;
}
```

Reemplazar las líneas 53-62:

```css
.fc .fc-daygrid-day.fc-day-today {
  background-color: transparent;
  box-shadow: inset 0 0 0 2px #3b82f6;
}
.fc .fc-daygrid-day.fc-day-libre:not(.fc-day-other) {
  background-color: #22c55e;
}
.fc .fc-daygrid-day.fc-day-has-reserva {
  background-color: #ef4444;
}
```

por:

```css
.fc .fc-daygrid-day.fc-day-today {
  background-color: transparent;
  box-shadow: inset 0 0 0 2px #0369a1;
}
.fc .fc-daygrid-day.fc-day-libre:not(.fc-day-other) {
  background-color: #5eead4;
}
.fc .fc-daygrid-day.fc-day-has-reserva {
  background-color: #dc2626;
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js index.html src/index.css
git commit -m "feat: establish Swiss-style design tokens"
```

---

### Task 2: Barra de navegación (`App.tsx`)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: Fondo oscuro con línea de acento en vez del gradiente**

Reemplazar la línea 71:

```tsx
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
```

por:

```tsx
      <nav className="bg-gray-900 border-b-4 border-primary p-4 flex justify-between items-center flex-wrap gap-2">
```

- [ ] **Step 2: Título con tipografía de encabezado**

Reemplazar las líneas 72-77:

```tsx
        <h1
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => setVista('dashboard')}
        >
          🗄️ SaltarAdmin
        </h1>
```

por:

```tsx
        <h1
          className="font-heading text-2xl font-bold text-white cursor-pointer"
          onClick={() => setVista('dashboard')}
        >
          🗄️ SaltarAdmin
        </h1>
```

- [ ] **Step 3: Botones de navegación en contorno (no relleno) y esquinas rectas**

Reemplazar el array `navButtons` (líneas 60-67):

```tsx
  const navButtons: { label: string; onClick: () => void; className: string }[] = [
    { label: '🏠 Dashboard', onClick: () => setVista('dashboard'), className: 'bg-white text-gray-800 hover:bg-gray-100' },
    { label: '📆 Calendario', onClick: () => setVista('calendario'), className: 'bg-teal-600 text-white hover:bg-teal-700' },
    { label: '📅 Nueva Reserva', onClick: handleNuevaReservaClick, className: 'bg-green-600 text-white hover:bg-green-700' },
    { label: '📝 Gestionar Reservas', onClick: () => setModalGestionarOpen(true), className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
    { label: '📋 Historial', onClick: () => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial')), className: 'bg-blue-600 text-white hover:bg-blue-700' },
    { label: '⚙️ Gestionar Artículos', onClick: () => setModalArticuloOpen(true), className: 'bg-gray-600 text-white hover:bg-gray-700' },
  ]
```

por:

```tsx
  const navButtons: { label: string; onClick: () => void; className: string }[] = [
    { label: '🏠 Dashboard', onClick: () => setVista('dashboard'), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📆 Calendario', onClick: () => setVista('calendario'), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📅 Nueva Reserva', onClick: handleNuevaReservaClick, className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📝 Gestionar Reservas', onClick: () => setModalGestionarOpen(true), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📋 Historial', onClick: () => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial')), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '⚙️ Gestionar Artículos', onClick: () => setModalArticuloOpen(true), className: 'border border-white/30 text-white hover:bg-white/10' },
  ]
```

Y su uso (líneas 82-90 y 111-121) cambia el sufijo de clases `rounded-lg` a `rounded-none` en las dos plantillas del botón:

Reemplazar:

```tsx
                    className={`${btn.className} px-5 py-2.5 text-lg rounded-lg transition`}
```

por:

```tsx
                    className={`${btn.className} px-5 py-2.5 text-lg rounded-none transition`}
```

(Aparece dos veces, en la lista de escritorio y en el menú móvil — sustituir ambas.)

- [ ] **Step 4: Botón hamburguesa móvil y "Sign in" — esquinas rectas**

Reemplazar:

```tsx
                className="md:hidden bg-white text-gray-800 px-4 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition"
```

por:

```tsx
                className="md:hidden bg-white text-gray-800 px-4 py-2.5 text-lg rounded-none hover:bg-gray-100 transition"
```

Reemplazar:

```tsx
              <button className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition">
                Sign in
              </button>
```

por:

```tsx
              <button className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-none hover:bg-gray-100 transition">
                Sign in
              </button>
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Verificar en vivo (regresión estructural, sin sesión real)**

Arrancar `npm run dev`, aplicar el bypass temporal `{true || isSignedIn}` en `src/App.tsx` (revertirlo exactamente después, confirmando con `git diff` que solo quedan los cambios de este task). Con Playwright, confirmar: nav de fondo oscuro con línea teal en el borde inferior, botones en contorno (no relleno) con esquinas rectas, y que el menú móvil también los muestra así.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: apply Swiss-style dark nav with accent underline"
```

---

### Task 3: `ReserveModal.tsx` + `PrivacyNoticeModal.tsx`

**Files:**
- Modify: `src/components/ReserveModal.tsx`
- Modify: `src/components/PrivacyNoticeModal.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: `ReserveModal.tsx` — tarjeta del modal: esquinas rectas + borde en vez de sombra**

Reemplazar:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 2: `ReserveModal.tsx` — título**

Reemplazar:

```tsx
          <h2 className="text-xl font-bold mb-1 text-gray-800">📝 Crear Reserva</h2>
```

por:

```tsx
          <h2 className="font-heading text-2xl font-bold mb-1 text-gray-900">📝 Crear Reserva</h2>
```

- [ ] **Step 3: `ReserveModal.tsx` — inputs: esquinas rectas + foco teal**

Sustituir cada aparición del texto exacto:

```
w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500
```

por:

```
w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary
```

(Aparece de forma idéntica en 7 inputs: `formArticuloId`, `formFechaInicio`, `formFechaFin`, `clienteNombre`, `clienteTelefono`, `clienteEmail`, `notas`.)

- [ ] **Step 4: `ReserveModal.tsx` — enlace de política de privacidad**

Reemplazar:

```tsx
            <button
              type="button"
              onClick={() => setModalPrivacidadOpen(true)}
              className="text-blue-600 underline hover:text-blue-800"
            >
              política de privacidad
            </button>
```

por:

```tsx
            <button
              type="button"
              onClick={() => setModalPrivacidadOpen(true)}
              className="text-primary underline hover:text-primary/80"
            >
              política de privacidad
            </button>
```

- [ ] **Step 5: `ReserveModal.tsx` — botones de envío y cancelar**

Reemplazar:

```tsx
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
```

por:

```tsx
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-none hover:bg-primary/90 transition disabled:opacity-50"
          >
            ✅ Crear Reserva
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition ml-2"
          >
            Cancelar
          </button>
```

- [ ] **Step 6: `PrivacyNoticeModal.tsx` — tarjeta, título, y botón de cierre**

Reemplazar:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">🔒 Política de Privacidad</h2>
```

por:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-gray-900">🔒 Política de Privacidad</h2>
```

Reemplazar:

```tsx
        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
```

por:

```tsx
        <button
          onClick={onClose}
          className="mt-4 border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
```

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 8: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Abrir "Nueva Reserva": confirmar esquinas rectas, borde en vez de sombra, título más grande, botón "Crear Reserva" teal, "Cancelar" en contorno. Abrir el modal de privacidad y confirmar el mismo tratamiento.

- [ ] **Step 9: Commit**

```bash
git add src/components/ReserveModal.tsx src/components/PrivacyNoticeModal.tsx
git commit -m "feat: apply Swiss-style design to ReserveModal and PrivacyNoticeModal"
```

---

### Task 4: `ManageArticleModal.tsx` + `GestionarReservasModal.tsx`

**Files:**
- Modify: `src/components/ManageArticleModal.tsx`
- Modify: `src/components/GestionarReservasModal.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: `ManageArticleModal.tsx` — tarjeta y título**

Reemplazar:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">⚙️ Gestionar Artículos</h2>
```

por:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-gray-900">⚙️ Gestionar Artículos</h2>
```

- [ ] **Step 2: `ManageArticleModal.tsx` — inputs**

Sustituir cada aparición de:

```
className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
```

por:

```
className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

(3 ocurrencias: `nombre`, `categoria`, `estado`.)

- [ ] **Step 3: `ManageArticleModal.tsx` — select de estado por fila y botón "Eliminar" (destructivo, mismo color, esquinas rectas)**

Reemplazar:

```tsx
                      className="text-sm border rounded-lg px-2 py-1"
```

por:

```tsx
                      className="text-sm border rounded-none px-2 py-1"
```

Reemplazar:

```tsx
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm"
```

por:

```tsx
                      className="bg-red-600 text-white px-3 py-2 rounded-none hover:bg-red-700 transition text-sm"
```

- [ ] **Step 4: `ManageArticleModal.tsx` — botones "Crear", "Cancelar", "➕ Nuevo Artículo", "Cerrar"**

Reemplazar:

```tsx
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
```

por:

```tsx
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-none hover:bg-primary/90 transition">
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition ml-2"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-none hover:bg-primary/90 transition"
          >
            ➕ Nuevo Artículo
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-4 border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
```

- [ ] **Step 5: `GestionarReservasModal.tsx` — tarjeta y título**

Reemplazar:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📝 Gestionar Reservas</h2>
```

por:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-gray-900">📝 Gestionar Reservas</h2>
```

- [ ] **Step 6: `GestionarReservasModal.tsx` — buscador**

Reemplazar:

```tsx
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
```

por:

```tsx
            className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

- [ ] **Step 7: `GestionarReservasModal.tsx` — botones "Guardar", "Cancelar edición", "✏️ Editar", "❌ Cancelar", "Cerrar"**

Reemplazar:

```tsx
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
```

por:

```tsx
                  <button
                    onClick={() => handleGuardarEdicion(reserva)}
                    className="bg-primary text-white px-3 py-1 rounded-none hover:bg-primary/90 transition text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelarEdicion}
                    className="border border-gray-900 text-gray-900 bg-transparent px-3 py-1 rounded-none hover:bg-gray-100 transition text-sm ml-2"
                  >
                    Cancelar edición
                  </button>
```

Reemplazar:

```tsx
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
```

por:

```tsx
                    <button
                      onClick={() => handleEmpezarEdicion(reserva)}
                      className="bg-primary text-white px-3 py-2 rounded-none hover:bg-primary/90 transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleCancelarReserva(reserva.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-none hover:bg-red-700 transition"
                    >
                      ❌ Cancelar
                    </button>
```

Reemplazar:

```tsx
        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
```

por:

```tsx
        <button
          onClick={onClose}
          className="mt-4 border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
```

- [ ] **Step 8: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 9: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Confirmar en ambos modales: esquinas rectas, borde en vez de sombra, títulos más grandes, botones principales en teal, botones secundarios en contorno negro, botón "Eliminar"/"❌ Cancelar" siguen en rojo sólido.

- [ ] **Step 10: Commit**

```bash
git add src/components/ManageArticleModal.tsx src/components/GestionarReservasModal.tsx
git commit -m "feat: apply Swiss-style design to ManageArticleModal and GestionarReservasModal"
```

---

### Task 5: `ArticleDetailModal.tsx` + `DayReservationsModal.tsx`

**Files:**
- Modify: `src/components/ArticleDetailModal.tsx`
- Modify: `src/components/DayReservationsModal.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: `ArticleDetailModal.tsx` — tarjeta, imagen, y título**

Reemplazar:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
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

por:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {articulo.imagen_url && (
          <img
            src={articulo.imagen_url}
            alt={articulo.nombre}
            className="w-full h-48 object-cover rounded-none mb-4"
          />
        )}
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold text-gray-900">{articulo.nombre}</h2>
```

- [ ] **Step 2: `ArticleDetailModal.tsx` — subtítulos "Historial de reservas" y "Bloqueos"**

Reemplazar:

```tsx
            <h3 className="font-semibold text-gray-700 mb-2">Historial de reservas</h3>
```

por:

```tsx
            <h3 className="font-heading font-semibold text-gray-900 mb-2 uppercase text-sm tracking-wide">Historial de reservas</h3>
```

Reemplazar:

```tsx
            <h3 className="font-semibold text-gray-700 mb-2">Bloqueos</h3>
```

por:

```tsx
            <h3 className="font-heading font-semibold text-gray-900 mb-2 uppercase text-sm tracking-wide">Bloqueos</h3>
```

- [ ] **Step 3: `ArticleDetailModal.tsx` — botón "Eliminar" de bloqueo (destructivo, mismo color)**

Reemplazar:

```tsx
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm self-start sm:self-auto"
```

por:

```tsx
                      className="bg-red-600 text-white px-3 py-2 rounded-none hover:bg-red-700 transition text-sm self-start sm:self-auto"
```

- [ ] **Step 4: `ArticleDetailModal.tsx` — inputs del formulario de bloqueo**

Sustituir cada aparición de:

```
className="w-full px-2 py-1 border rounded-lg text-sm"
```

por:

```
className="w-full px-2 py-1 border rounded-none text-sm"
```

(3 ocurrencias: `nuevoInicio`, `nuevoFin`, `nuevoMotivo`.)

- [ ] **Step 5: `ArticleDetailModal.tsx` — botón "Añadir Bloqueo" y "Cerrar"**

Reemplazar:

```tsx
              <button
                type="submit"
                className="sm:col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
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
```

por:

```tsx
              <button
                type="submit"
                className="sm:col-span-2 bg-primary text-white px-4 py-2 rounded-none hover:bg-primary/90 transition"
              >
                Añadir Bloqueo
              </button>
            </form>
          </>
        )}

        <button
          onClick={onClose}
          className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
```

- [ ] **Step 6: `DayReservationsModal.tsx` — tarjeta y título**

Reemplazar:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📅 {formatFecha(fecha)}</h2>
```

por:

```tsx
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-gray-900">📅 {formatFecha(fecha)}</h2>
```

- [ ] **Step 7: `DayReservationsModal.tsx` — botón "Cerrar"**

Reemplazar:

```tsx
        <button
          onClick={onClose}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
```

por:

```tsx
        <button
          onClick={onClose}
          className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
```

- [ ] **Step 8: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 9: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Abrir el detalle de un artículo desde el Dashboard: confirmar esquinas rectas, subtítulos en mayúsculas con tracking, botón "Añadir Bloqueo" en teal.

- [ ] **Step 10: Commit**

```bash
git add src/components/ArticleDetailModal.tsx src/components/DayReservationsModal.tsx
git commit -m "feat: apply Swiss-style design to ArticleDetailModal and DayReservationsModal"
```

---

### Task 6: Calendario e Historial

**Files:**
- Modify: `src/components/Calendar.tsx`
- Modify: `src/components/MonthCalendarView.tsx`
- Modify: `src/components/ReservationHistory.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading`, colores de `index.css` (Task 1).

- [ ] **Step 1: `Calendar.tsx` — contenedor principal: borde en vez de sombra**

Reemplazar:

```tsx
    <div className="bg-white p-4 rounded-lg shadow-lg relative">
```

por:

```tsx
    <div className="bg-white p-4 rounded-none border border-gray-200 relative">
```

- [ ] **Step 2: `Calendar.tsx` — popover de reserva: mantiene sombra (elevación funcional), pero esquinas rectas**

Reemplazar:

```tsx
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64"
            style={{ top: popover.y, left: popover.x }}
          >
```

por:

```tsx
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-none shadow-xl p-4 w-64"
            style={{ top: popover.y, left: popover.x }}
          >
```

- [ ] **Step 3: `Calendar.tsx` — título del popover**

Reemplazar:

```tsx
            <h3 className="font-bold text-gray-800 mb-2">{popover.reserva.cliente_nombre}</h3>
```

por:

```tsx
            <h3 className="font-heading font-bold text-gray-900 mb-2">{popover.reserva.cliente_nombre}</h3>
```

(Los colores de `reservaEvents`/`bloqueoEvents` no cambian — ya coinciden con los tokens o son deliberadamente neutros, como en la ronda anterior.)

- [ ] **Step 4: `MonthCalendarView.tsx` — contenedor principal: borde en vez de sombra**

Reemplazar:

```tsx
    <div className="bg-white p-4 rounded-lg shadow-lg relative">
```

por:

```tsx
    <div className="bg-white p-4 rounded-none border border-gray-200 relative">
```

- [ ] **Step 5: `ReservationHistory.tsx` — contenedor, título, y buscador**

Reemplazar:

```tsx
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">📋 Historial de Reservas</h2>
```

por:

```tsx
    <div className="bg-white p-4 rounded-none border border-gray-200">
      <h2 className="font-heading text-2xl font-bold mb-4 text-gray-900">📋 Historial de Reservas</h2>
```

Reemplazar:

```tsx
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
```

por:

```tsx
          className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

- [ ] **Step 6: `ReservationHistory.tsx` — badges de estado**

Reemplazar el objeto `ESTADO_STYLES` (líneas 6-11):

```tsx
const ESTADO_STYLES: Record<ReservaEstado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  completada: 'bg-blue-100 text-blue-800',
}
```

por:

```tsx
const ESTADO_STYLES: Record<ReservaEstado, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  completada: 'bg-teal-100 text-teal-800',
}
```

Reemplazar (el `<select>` que usa `ESTADO_STYLES`):

```tsx
                      className={`px-2 py-1 rounded ${ESTADO_STYLES[reserva.estado]}`}
```

por:

```tsx
                      className={`px-2 py-1 rounded-none ${ESTADO_STYLES[reserva.estado]}`}
```

- [ ] **Step 7: `ReservationHistory.tsx` — botones "Cancelar Reserva" y "Eliminar permanentemente" (mismos colores, solo esquinas rectas)**

Reemplazar:

```tsx
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition disabled:opacity-40"
```

por:

```tsx
                      className="bg-red-600 text-white px-3 py-1 rounded-none hover:bg-red-700 transition disabled:opacity-40"
```

Reemplazar:

```tsx
                      className="bg-gray-800 text-white px-3 py-1 rounded-lg hover:bg-gray-900 transition ml-2"
```

por:

```tsx
                      className="bg-gray-800 text-white px-3 py-1 rounded-none hover:bg-gray-900 transition ml-2"
```

- [ ] **Step 8: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 9: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Confirmar Dashboard/Calendario con borde fino en vez de sombra, y esquinas rectas; Historial con título más grande y badges de estado en los nuevos colores.

- [ ] **Step 10: Commit**

```bash
git add src/components/Calendar.tsx src/components/MonthCalendarView.tsx src/components/ReservationHistory.tsx
git commit -m "feat: apply Swiss-style design to calendar and history views"
```

---

### Task 7: Verificación final en vivo con sesión real

**Files:** ninguno (solo verificación).

**Quién ejecuta esto:** el usuario, con la sesión controladora guiándolo. Requiere sesión real para ver datos reales con el nuevo diseño.

- [ ] **Step 1: Recorrido visual completo con sesión real**

Con sesión real de Clerk iniciada: recorrer Dashboard, Calendario, Historial, y abrir cada uno de los 7 modales. Confirmar el conjunto: nav oscuro con línea de acento teal, esquinas rectas en todo, sin sombras decorativas (salvo el popover del calendario), botones secundarios en contorno, botones principales en teal sólido, títulos más grandes y con más peso.

- [ ] **Step 2: Confirmar que ningún flujo funcional se rompió**

Crear una reserva de prueba, editarla, cancelarla, y eliminarla permanentemente — debe funcionar exactamente igual que antes, solo con el aspecto nuevo.

- [ ] **Step 3: Revisar en un viewport móvil**

Redimensionar la ventana o usar el modo dispositivo móvil del navegador y confirmar que el nav oscuro y los modales se siguen viendo bien en pantalla estrecha.

- [ ] **Step 4: Limpiar datos de prueba**

Eliminar permanentemente la reserva de prueba creada en el Step 2.

- [ ] **Step 5: Reportar el resultado al usuario**

Resumen de qué se verificó y el resultado — sin necesidad de commit (ningún archivo cambia en esta task). Recordar al usuario que debe decidir qué hacer con la rama de la ronda anterior (`worktree-saltaradmin-rediseno-visual`), que esta ronda sustituye por completo.
