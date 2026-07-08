# SaltarAdmin — Diseño: navegación al dashboard, eliminar artículos, popover completo y relleno visual del evento

## Contexto

Tercera tanda de mejoras sobre SaltarAdmin, tras usar la app con las dos tandas anteriores ya mergeadas a `master`. El usuario pidió cuatro cosas: un botón para volver siempre al calendario/dashboard, un botón para eliminar artículos por completo de la base de datos, más información en el popover de reserva del calendario, y un arreglo visual donde el bloque rojo de una reserva no rellenaba por completo su celda verde.

## Alcance

1. Botón "Dashboard" que siempre lleva al calendario, y que el título "SaltarAdmin" haga lo mismo al pinchar.
2. Botón "Eliminar" independiente por artículo en "Gestionar Artículos", con confirmación nativa del navegador y bloqueo si el artículo tiene reservas/bloqueos asociados.
3. El popover de reserva del calendario muestra también email y notas, además de lo que ya muestra (nombre, teléfono, fechas, estado).
4. Arreglo CSS para que los eventos (reservas y bloqueos) del calendario rellenen completamente su celda, sin dejar el fondo verde visible alrededor.

## Diseño

### 1. Botón Dashboard

- Nuevo botón **"🏠 Dashboard"** en el header de `App.tsx`, primero en el orden de botones (antes de "📅 Nueva Reserva"). Estilo distinto a los demás (fondo blanco/`bg-white text-gray-800`) para diferenciarlo visualmente como "volver al inicio" frente a las acciones de gestión.
- A diferencia del botón "Historial" (que alterna `showHistorial`), este botón siempre ejecuta `setShowHistorial(false)` — acción directa, no toggle.
- El `<h1>` "🗄️ SaltarAdmin" recibe `onClick={() => setShowHistorial(false)}` y `cursor-pointer`, mismo comportamiento que el botón Dashboard.

### 2. Eliminar artículo

- Nueva función `deleteArticulo(id: string): Promise<void>` en `src/lib/supabase.ts`, que hace `supabase.from('articulos').delete().eq('id', id)`.
- En `ManageArticleModal.tsx`, cada fila de artículo obtiene un botón **"🗑️ Eliminar"** independiente del `<select>` de estado (no anidado en él, un control aparte al lado).
- Al pulsarlo: `window.confirm('¿Seguro que quieres eliminar "{nombre}" permanentemente? Esta acción no se puede deshacer.')`. Si el usuario cancela, no pasa nada.
- Si confirma, se llama a `deleteArticulo(id)`. Si Supabase devuelve un error de restricción de clave foránea (el artículo tiene reservas o bloqueos asociados — código de error Postgres `23503`), se muestra: *"No se puede eliminar: este artículo tiene reservas o bloqueos asociados. Cámbialo a estado 'baja' en su lugar, o elimina primero sus reservas/bloqueos."* Para cualquier otro error, se usa el mensaje genérico ya existente en el patrón del componente.
- Si se elimina con éxito, se recarga la lista de artículos y se llama a `onArticulosChanged()` (ya existente, refresca también el calendario).

### 3. Popover de reserva: email y notas

- En `Calendar.tsx`, el popover que aparece al pinchar una reserva ya tiene acceso al objeto `Reserva` completo (incluye `cliente_email` y `notas`, ambos `string | null`). Solo falta renderizarlos.
- Se añaden dos líneas condicionales (solo si el campo no es `null`/vacío) después de la línea de teléfono y antes de las fechas: `✉️ {email}` y, tras el estado, `📝 {notas}` en un bloque aparte para no forzar el ancho del popover si las notas son largas.

### 4. Relleno completo del evento en el calendario

Causa raíz confirmada mediante inspección en vivo del DOM/CSS renderizado: el contenedor interno de FullCalendar que aloja los eventos de una fila (`.fc-timeline-events`) tiene `padding-bottom: 10px` con `box-sizing: content-box`, lo que añade 10px de espacio **fuera** de la altura que FullCalendar le fija dinámicamente — ese espacio sobrante se veía como fondo verde debajo/alrededor del bloque rojo. Además, el propio evento tenía un `margin` de 1px en dos lados que dejaba una fina línea verde en el borde.

Arreglo, en `src/index.css` (verificado visualmente: con este CSS, la altura del evento coincide exactamente con la altura de su fila, sin desbordar ni dejar huecos):

```css
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

## Estructura de archivos

- Modificar: `src/lib/supabase.ts` (añadir `deleteArticulo`)
- Modificar: `src/components/ManageArticleModal.tsx` (botón eliminar + confirmación + manejo de error de FK)
- Modificar: `src/App.tsx` (botón Dashboard + título clicable)
- Modificar: `src/components/Calendar.tsx` (popover con email/notas)
- Modificar: `src/index.css` (CSS de relleno del evento)

## Testing / verificación

Sin suite de tests automatizados (confirmado, sin cambios respecto a las tandas anteriores). Verificación: `npx tsc --noEmit`, `npm run build`, y prueba manual en navegador cubriendo: el botón Dashboard y el título llevan al calendario desde Historial y desde dentro de cualquier modal cerrado; eliminar un artículo sin reservas asociadas funciona tras confirmar; intentar eliminar un artículo con reservas/bloqueos asociados muestra el mensaje de bloqueo y no borra nada; el popover de una reserva con email y notas rellenados los muestra, y con esos campos vacíos no muestra líneas vacías; visualmente, el bloque de una reserva y de un bloqueo rellenan completamente su celda sin fondo verde visible alrededor.
