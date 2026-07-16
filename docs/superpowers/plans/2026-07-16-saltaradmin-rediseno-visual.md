# Rediseño visual profesional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar un sistema de diseño coherente (paleta Trust Teal + tipografía Lexend/Source Sans 3) en toda la app, sustituyendo colores sueltos de Tailwind (`bg-blue-600`, `bg-green-600`...) por los tokens semánticos ya definidos parcialmente en `tailwind.config.js`.

**Architecture:** Cambios de configuración (Tailwind + fuentes) en Task 1, luego sustitución mecánica de clases en cada componente existente, agrupados por cercanía funcional. Sin cambios de estructura, lógica, ni comportamiento — solo clases CSS y algún valor hexadecimal en `index.css`/`Calendar.tsx`.

**Tech Stack:** React + TypeScript, Tailwind CSS 3.4, FullCalendar (colores vía CSS y props inline).

## Global Constraints

- Ningún cambio de comportamiento o estructura — solo colores, tipografía, y clases CSS.
- No se extraen componentes compartidos (`<Modal>`, `<Button>`) — fuera de alcance, aparcado por decisión del usuario.
- El significado semántico de los colores no cambia (verde = confirmada/disponible, rojo = cancelada/peligro, ámbar = pendiente/aviso) — solo se homogeniza el tono exacto usado.
- Tokens finales a usar en todo el proyecto:
  - `primary` → `#0F766E` (teal)
  - `accent` → `#0369A1` (azul, uso puntual, no dominante)
  - `success` → `#16a34a` (sin cambio de valor)
  - `danger` → `#dc2626` (sin cambio de valor)
  - `warning` → `#d97706` (nuevo)
  - `fontFamily.sans` → `'Source Sans 3'` (cuerpo de texto, aplicado por defecto)
  - `fontFamily.heading` → `'Lexend'` (títulos, aplicado explícitamente con la clase `font-heading`)

---

### Task 1: Tokens de diseño (Tailwind, fuentes, CSS del calendario)

**Files:**
- Modify: `tailwind.config.js`
- Modify: `index.html`
- Modify: `src/index.css`

**Interfaces:**
- Produces: clases Tailwind `bg-primary`, `text-primary`, `border-primary`, `bg-accent`, `bg-warning`, `font-heading` disponibles para las siguientes tasks. `bg-success`/`bg-danger` ya existían, sin cambio de valor.

- [ ] **Step 1: Actualizar `tailwind.config.js`**

Reemplazar el contenido completo del archivo:

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

Reemplazar la línea 7 (dentro de la regla `body`):

```css
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
```

por:

```css
  font-family: 'Source Sans 3', ui-sans-serif, system-ui, sans-serif;
```

Reemplazar la línea 17-18:

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
Expected: sin errores (este task no toca `.tsx`, pero confirma que nada se rompió antes de seguir).

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js index.html src/index.css
git commit -m "feat: establish teal/Lexend design tokens"
```

---

### Task 2: Barra de navegación (`App.tsx`)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: Unificar el color de los 6 botones de navegación**

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
    { label: '🏠 Dashboard', onClick: () => setVista('dashboard'), className: 'bg-white/10 text-white hover:bg-white/20' },
    { label: '📆 Calendario', onClick: () => setVista('calendario'), className: 'bg-white/10 text-white hover:bg-white/20' },
    { label: '📅 Nueva Reserva', onClick: handleNuevaReservaClick, className: 'bg-white/10 text-white hover:bg-white/20' },
    { label: '📝 Gestionar Reservas', onClick: () => setModalGestionarOpen(true), className: 'bg-white/10 text-white hover:bg-white/20' },
    { label: '📋 Historial', onClick: () => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial')), className: 'bg-white/10 text-white hover:bg-white/20' },
    { label: '⚙️ Gestionar Artículos', onClick: () => setModalArticuloOpen(true), className: 'bg-white/10 text-white hover:bg-white/20' },
  ]
```

- [ ] **Step 2: Reemplazar el gradiente del nav por el color de marca sólido, y el título por la fuente de títulos**

Reemplazar la línea 71:

```tsx
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
```

por:

```tsx
      <nav className="bg-primary p-4 flex justify-between items-center flex-wrap gap-2">
```

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

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Verificar en vivo (regresión estructural, sin sesión real)**

Arrancar `npm run dev`, aplicar el bypass temporal `{true || isSignedIn}` en `src/App.tsx` (revertirlo exactamente después, confirmando con `git diff` que solo quedan los cambios de este task — no el bypass). Con Playwright, confirmar: el nav se ve en color teal sólido (no el gradiente azul-naranja anterior), los 6 botones tienen el mismo estilo entre sí, y el menú móvil (`md:hidden`, redimensionar el viewport si hace falta) también los muestra consistentes.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: apply teal design system to navigation"
```

---

### Task 3: `ReserveModal.tsx` + `PrivacyNoticeModal.tsx`

**Files:**
- Modify: `src/components/ReserveModal.tsx`
- Modify: `src/components/PrivacyNoticeModal.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: `ReserveModal.tsx` — título**

Reemplazar la línea 116:

```tsx
          <h2 className="text-xl font-bold mb-1 text-gray-800">📝 Crear Reserva</h2>
```

por:

```tsx
          <h2 className="font-heading text-xl font-bold mb-1 text-gray-800">📝 Crear Reserva</h2>
```

- [ ] **Step 2: `ReserveModal.tsx` — enlace de política de privacidad**

Reemplazar (dentro del párrafo añadido en el bloqueante #5):

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

- [ ] **Step 3: `ReserveModal.tsx` — focus de los inputs**

Sustituir cada aparición de:

```
focus:outline-none focus:border-blue-500
```

por:

```
focus:outline-none focus:border-primary
```

(Aparece de forma idéntica en los inputs `formArticuloId` (select), `formFechaInicio`, `formFechaFin`, `clienteNombre`, `clienteTelefono`, `clienteEmail`, `notas` — 7 ocurrencias en total del mismo texto exacto.)

- [ ] **Step 4: `ReserveModal.tsx` — botón de envío**

Reemplazar la línea del botón de submit:

```tsx
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
```

por:

```tsx
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
```

- [ ] **Step 5: `PrivacyNoticeModal.tsx` — título**

Reemplazar:

```tsx
          <h2 className="text-xl font-bold text-gray-800">🔒 Política de Privacidad</h2>
```

por:

```tsx
          <h2 className="font-heading text-xl font-bold text-gray-800">🔒 Política de Privacidad</h2>
```

- [ ] **Step 6: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 7: Verificar en vivo (regresión estructural, sin sesión real)**

Con el mismo bypass temporal (aplicar y revertir igual que en Task 2). Abrir "Nueva Reserva": confirmar que el botón "Crear Reserva" es teal, el enlace "política de privacidad" es teal subrayado, y hacer foco en cualquier input muestra el borde teal en vez de azul. Abrir el modal de privacidad y confirmar que su título usa la tipografía de encabezado (más marcada).

- [ ] **Step 8: Commit**

```bash
git add src/components/ReserveModal.tsx src/components/PrivacyNoticeModal.tsx
git commit -m "feat: apply teal design system to ReserveModal and PrivacyNoticeModal"
```

---

### Task 4: `ManageArticleModal.tsx` + `GestionarReservasModal.tsx`

**Files:**
- Modify: `src/components/ManageArticleModal.tsx`
- Modify: `src/components/GestionarReservasModal.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: `ManageArticleModal.tsx` — título**

Reemplazar:

```tsx
          <h2 className="text-xl font-bold text-gray-800">⚙️ Gestionar Artículos</h2>
```

por:

```tsx
          <h2 className="font-heading text-xl font-bold text-gray-800">⚙️ Gestionar Artículos</h2>
```

- [ ] **Step 2: `ManageArticleModal.tsx` — focus de inputs**

Sustituir las 3 ocurrencias de:

```
focus:outline-none focus:border-blue-500
```

por:

```
focus:outline-none focus:border-primary
```

(aparecen en los campos `nombre`, `categoria`, `estado` del formulario).

- [ ] **Step 3: `ManageArticleModal.tsx` — botones "Crear" y "Nuevo Artículo"**

Reemplazar:

```tsx
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              Crear
            </button>
```

por:

```tsx
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition">
              Crear
            </button>
```

Reemplazar:

```tsx
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            ➕ Nuevo Artículo
          </button>
```

por:

```tsx
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            ➕ Nuevo Artículo
          </button>
```

- [ ] **Step 4: `GestionarReservasModal.tsx` — título**

Reemplazar:

```tsx
          <h2 className="text-xl font-bold text-gray-800">📝 Gestionar Reservas</h2>
```

por:

```tsx
          <h2 className="font-heading text-xl font-bold text-gray-800">📝 Gestionar Reservas</h2>
```

- [ ] **Step 5: `GestionarReservasModal.tsx` — focus del buscador**

Reemplazar:

```tsx
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
```

por:

```tsx
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary"
```

- [ ] **Step 6: `GestionarReservasModal.tsx` — botones "Guardar" y "Editar"**

Reemplazar:

```tsx
                  <button
                    onClick={() => handleGuardarEdicion(reserva)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    Guardar
                  </button>
```

por:

```tsx
                  <button
                    onClick={() => handleGuardarEdicion(reserva)}
                    className="bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 transition text-sm"
                  >
                    Guardar
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
```

por:

```tsx
                    <button
                      onClick={() => handleEmpezarEdicion(reserva)}
                      className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition"
                    >
                      ✏️ Editar
                    </button>
```

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 8: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Abrir "Gestionar Artículos": confirmar botones "Crear"/"➕ Nuevo Artículo" en teal, foco de inputs en teal. Abrir "Gestionar Reservas": confirmar buscador con foco teal (aunque sin datos reales, el estado vacío también se ve).

- [ ] **Step 9: Commit**

```bash
git add src/components/ManageArticleModal.tsx src/components/GestionarReservasModal.tsx
git commit -m "feat: apply teal design system to ManageArticleModal and GestionarReservasModal"
```

---

### Task 5: `ArticleDetailModal.tsx` + `DayReservationsModal.tsx`

**Files:**
- Modify: `src/components/ArticleDetailModal.tsx`
- Modify: `src/components/DayReservationsModal.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading` (Task 1).

- [ ] **Step 1: `ArticleDetailModal.tsx` — títulos**

Reemplazar:

```tsx
          <h2 className="text-xl font-bold text-gray-800">{articulo.nombre}</h2>
```

por:

```tsx
          <h2 className="font-heading text-xl font-bold text-gray-800">{articulo.nombre}</h2>
```

Reemplazar:

```tsx
            <h3 className="font-semibold text-gray-700 mb-2">Historial de reservas</h3>
```

por:

```tsx
            <h3 className="font-heading font-semibold text-gray-700 mb-2">Historial de reservas</h3>
```

Reemplazar:

```tsx
            <h3 className="font-semibold text-gray-700 mb-2">Bloqueos</h3>
```

por:

```tsx
            <h3 className="font-heading font-semibold text-gray-700 mb-2">Bloqueos</h3>
```

- [ ] **Step 2: `ArticleDetailModal.tsx` — botón "Añadir Bloqueo"**

Reemplazar:

```tsx
              <button
                type="submit"
                className="sm:col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Añadir Bloqueo
              </button>
```

por:

```tsx
              <button
                type="submit"
                className="sm:col-span-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
              >
                Añadir Bloqueo
              </button>
```

- [ ] **Step 3: `DayReservationsModal.tsx` — título**

Localizar la línea del `<h2>` que muestra `{formatFecha(fecha)}` (className actual: `"text-xl font-bold text-gray-800"`) y anteponer `font-heading` a su className, igual que en los pasos anteriores:

```tsx
          <h2 className="text-xl font-bold text-gray-800">📅 {formatFecha(fecha)}</h2>
```

por:

```tsx
          <h2 className="font-heading text-xl font-bold text-gray-800">📅 {formatFecha(fecha)}</h2>
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 5: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Confirmar visualmente los títulos con la tipografía de encabezado y el botón "Añadir Bloqueo" en teal al abrir el detalle de un artículo (clic en su nombre desde el Dashboard).

- [ ] **Step 6: Commit**

```bash
git add src/components/ArticleDetailModal.tsx src/components/DayReservationsModal.tsx
git commit -m "feat: apply teal design system to ArticleDetailModal and DayReservationsModal"
```

---

### Task 6: Calendario e Historial

**Files:**
- Modify: `src/components/Calendar.tsx`
- Modify: `src/components/ReservationHistory.tsx`

**Interfaces:**
- Consumes: `bg-primary`, `font-heading`, colores de `index.css` (Task 1).

- [ ] **Step 1: `Calendar.tsx` — título del popover de reserva**

Reemplazar:

```tsx
            <h3 className="font-bold text-gray-800 mb-2">{popover.reserva.cliente_nombre}</h3>
```

por:

```tsx
            <h3 className="font-heading font-bold text-gray-800 mb-2">{popover.reserva.cliente_nombre}</h3>
```

(Los colores de eventos `reservaEvents`/`bloqueoEvents` no cambian: `#dc2626` ya coincide exactamente con el token `danger`, y el gris `#9ca3af` de los bloqueos se mantiene deliberadamente neutro para distinguirlo de los estados semánticos.)

- [ ] **Step 2: `ReservationHistory.tsx` — título y foco del buscador**

Reemplazar:

```tsx
      <h2 className="text-xl font-bold mb-4 text-gray-800">📋 Historial de Reservas</h2>
```

por:

```tsx
      <h2 className="font-heading text-xl font-bold mb-4 text-gray-800">📋 Historial de Reservas</h2>
```

Reemplazar:

```tsx
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
```

por:

```tsx
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary"
```

- [ ] **Step 3: `ReservationHistory.tsx` — badges de estado**

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

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 5: Verificar en vivo (regresión estructural, sin sesión real)**

Con el bypass temporal (aplicar y revertir). Confirmar que el título del Historial usa la tipografía de encabezado, y que el Dashboard/Calendario muestran los nuevos colores de fondo (verde-teal para disponible, rojo para reservado) sin romper el layout.

- [ ] **Step 6: Commit**

```bash
git add src/components/Calendar.tsx src/components/ReservationHistory.tsx
git commit -m "feat: apply teal design system to calendar and history views"
```

---

### Task 7: Verificación final en vivo con sesión real

**Files:** ninguno (solo verificación).

**Quién ejecuta esto:** el usuario, con la sesión controladora guiándolo. Requiere sesión real para ver datos reales con los nuevos colores (badges de estado, eventos del calendario con datos de verdad).

- [ ] **Step 1: Recorrido visual completo con sesión real**

Con sesión real de Clerk iniciada: recorrer Dashboard, Calendario, Historial, y abrir cada uno de los 7 modales (Nueva Reserva, Gestionar Reservas, Gestionar Artículos, detalle de un artículo, Política de Privacidad, y el popover de una reserva en el calendario). Confirmar que el aspecto es consistente en todos: mismo teal para acciones principales, mismo rojo para destructivas, misma tipografía de títulos.

- [ ] **Step 2: Confirmar que ningún flujo funcional se rompió**

Crear una reserva de prueba, editarla, cancelarla, y eliminarla permanentemente (repitiendo los mismos pasos ya verificados en las rondas anteriores) — debe funcionar exactamente igual que antes, solo con el aspecto nuevo.

- [ ] **Step 3: Revisar en un viewport móvil**

Redimensionar la ventana del navegador (o usar las herramientas de desarrollador en modo dispositivo móvil) y confirmar que el nuevo nav y los modales se siguen viendo bien en pantalla estrecha — la ronda de responsive design anterior no debe haberse roto.

- [ ] **Step 4: Limpiar datos de prueba**

Eliminar permanentemente la reserva de prueba creada en el Step 2.

- [ ] **Step 5: Reportar el resultado al usuario**

Resumen de qué se verificó y el resultado — sin necesidad de commit (ningún archivo cambia en esta task).
