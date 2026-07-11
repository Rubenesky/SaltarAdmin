# SaltarAdmin — Pase de responsividad móvil — Design

**Date:** 2026-07-11
**Status:** Approved

## Motivación

Un análisis con tres perspectivas de experto (UX/interacción, diseño visual, ingeniería frontend responsive) sobre capturas reales de la app a 390×844 (viewport móvil) encontró que este proyecto no tiene ningún trabajo de responsividad hecho — cero prefijos `sm:`/`md:`/`lg:` de Tailwind en todo el código. Los problemas más graves: la barra de navegación ocupa la mitad de la pantalla, el Dashboard (vista `resourceTimelineMonth` de FullCalendar) solo muestra 3 de 31 columnas, formularios de 2 columnas truncan campos, y filas de lista rompen el texto contra los botones.

Este spec consolida los hallazgos de los tres expertos, ya resueltos con el usuario, en un plan de implementación único.

## Alcance

Doce mejoras, agrupadas por archivo/tema:

1. **Nav móvil**: menú hamburguesa + desplegable por debajo de `md:` (768px), reutilizando los botones existentes.
2. **Dashboard responsive**: la vista de FullCalendar cambia de `resourceTimelineMonth` a `resourceTimelineWeek` automáticamente por debajo de 768px de ancho de ventana.
3. **Popover de reserva**: se recalcula su posición para no salirse de la pantalla en viewports estrechos.
4. **Botón "Mes" redundante**: se elimina del toolbar del Dashboard (no ofrece ninguna opción real, es el único view).
5. **Formularios de 2 columnas → 1 columna en móvil**: `GestionarReservasModal` (edición), `ArticleDetailModal` (bloqueo), `ReserveModal` (fechas en modo standalone).
6. **Filas de lista → apiladas en móvil**: `GestionarReservasModal` (reservas), `ManageArticleModal` (artículos), `ArticleDetailModal` (bloqueos).
7. **Tamaño táctil de botones de acción**: Editar/Cancelar/Eliminar en los tres modales de gestión, unificando también el lenguaje visual (todas las acciones destructivas como botón sólido, no enlace de texto suelto).
8. **Padding de modales**: `p-6` fijo → `p-4 sm:p-6` en los 5 modales.
9. **`ReserveModal` sin límite de altura**: se añade `max-h-[85vh] overflow-y-auto`, igualando al resto de modales.
10. **Confirmación antes de cerrar con datos sin guardar**: al tocar fuera del modal (backdrop), si hay contenido sin guardar, se pide confirmación antes de cerrar — en `ReserveModal`, `ManageArticleModal`, `GestionarReservasModal` (mientras hay una edición abierta) y `ArticleDetailModal` (formulario de bloqueo).
11. **Contraste del botón "Sign in"**: se envuelve con el mismo estilo de píldora blanca que el resto de botones del nav, para que tenga contraste suficiente sobre el lado naranja del degradado.

Fuera de alcance (decidido explícitamente):
- Los colores verde/rojo del calendario mensual (elegidos deliberadamente hace poco a petición del usuario) **no se tocan**.
- Limpieza de la dependencia `@fullcalendar/timegrid` no usada — no tiene efecto observable (tree-shaken), no es un problema de mobile.
- Vista de agenda/lista alternativa para el Dashboard (se descartó a favor de cambiar de vista de FullCalendar, ver más abajo).

## Enfoque técnico

### Nav móvil (App.tsx)

Nuevo estado `const [menuAbierto, setMenuAbierto] = useState(false)`. El contenedor actual de botones (`flex flex-wrap gap-2 items-center`) pasa a `hidden md:flex ...` (visible tal cual en desktop). Se añade un botón hamburguesa `md:hidden` que alterna `menuAbierto`, y un segundo bloque `md:hidden` con los mismos botones en columna (`flex flex-col gap-2`, `w-full`) que solo se renderiza cuando `menuAbierto` es `true`. Cada click de botón dentro de ese menú también cierra el menú (`setMenuAbierto(false)`) para que no quede abierto tras navegar. `UserButton`/`SignInButton` se mantienen siempre visibles (fuera del bloque colapsable), ya que es una sola pieza pequeña, no un botón de navegación.

### Dashboard responsive (Calendar.tsx)

Se añade un `ref` de FullCalendar (`useRef<FullCalendar>(null)`) y un `useEffect` que registra un listener de `resize` en `window`: por debajo de 768px llama a `calendarApi.changeView('resourceTimelineWeek')`, por encima a `calendarApi.changeView('resourceTimelineMonth')`, comprobando también el ancho al montar (para que cargue ya en la vista correcta si la pantalla ya es estrecha). `resourceTimelineWeek` es parte del mismo plugin `resourceTimelinePlugin` ya importado — no hace falta ninguna dependencia nueva. El `headerToolbar.right` pasa de `'resourceTimelineMonth'` a `''` (ver punto "Mes" más abajo). El `select` callback y el resto de la configuración no cambian — ambas vistas comparten la misma API de recursos/eventos.

### Popover de reserva (Calendar.tsx)

En `handleEventClick`, en vez de guardar `{ x: info.jsEvent.pageX, y: info.jsEvent.pageY, reserva }` directamente, se clampa contra el viewport antes de guardar: el popover mide `w-64` (256px) de ancho; se calcula `left = Math.min(info.jsEvent.pageX + 8, window.innerWidth - 256 - 8)` y `top = Math.min(info.jsEvent.pageY + 8, window.innerHeight - 8)` (con un mínimo de 8 para no pegarlo al borde izquierdo/superior tampoco: `Math.max(8, ...)`).

### Formularios de 2 columnas (GestionarReservasModal.tsx, ArticleDetailModal.tsx, ReserveModal.tsx)

Cambio mecánico: toda ocurrencia de `grid grid-cols-2 gap-2` en estos tres archivos pasa a `grid grid-cols-1 sm:grid-cols-2 gap-2`. Las celdas `col-span-2` no cambian (siguen abarcando el ancho completo en ambos breakpoints).

### Filas de lista apiladas (GestionarReservasModal.tsx, ManageArticleModal.tsx, ArticleDetailModal.tsx)

Cambio mecánico: toda ocurrencia de `flex items-center justify-between` en las filas de lista de estos tres archivos (no en los headers de modal, que se quedan igual) pasa a `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`.

### Tamaño táctil y botones destructivos consistentes

- `GestionarReservasModal.tsx`: los botones "✏️ Editar"/"❌ Cancelar" ya son botones sólidos — se les sube el padding vertical de `py-1` a `py-2` para un objetivo táctil ≥40px.
- `ManageArticleModal.tsx`: "🗑️ Eliminar" pasa de enlace de texto (`text-red-600 hover:text-red-800 text-sm`) a botón sólido pequeño (`bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm`), igualando el lenguaje visual del resto de acciones destructivas de la app.
- `ArticleDetailModal.tsx`: el "Eliminar" de cada bloqueo recibe el mismo tratamiento que el de artículos.

### Padding de modales

Cambio mecánico: la clase `p-6` en el contenedor principal de los 5 modales (`GestionarReservasModal.tsx`, `ManageArticleModal.tsx`, `ArticleDetailModal.tsx`, `ReserveModal.tsx`, `DayReservationsModal.tsx`) pasa a `p-4 sm:p-6`.

### `ReserveModal` sin límite de altura

La clase del contenedor pasa de `bg-white p-6 rounded-lg shadow-xl max-w-md w-full` a `bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto` (incluye también el fix de padding anterior en el mismo cambio, mismo archivo/línea).

### Confirmación antes de cerrar (backdrop click)

Cada modal con formulario cambia el `onClick={onClose}` del backdrop por `onClick={handleBackdropClick}`, una función local que comprueba si hay contenido sin guardar y, si lo hay, pide `window.confirm('¿Descartar los cambios?')` antes de llamar a `onClose()`:

- `ReserveModal.tsx`: sucio si `clienteNombre.trim() !== '' || clienteTelefono.trim() !== '' || clienteEmail.trim() !== '' || notas.trim() !== ''`.
- `ManageArticleModal.tsx`: sucio si `showForm && nombre.trim() !== ''`.
- `GestionarReservasModal.tsx`: sucio si `editingId !== null` (hay una edición abierta).
- `ArticleDetailModal.tsx`: sucio si `nuevoInicio.trim() !== '' || nuevoFin.trim() !== '' || nuevoMotivo.trim() !== ''`.
- `DayReservationsModal.tsx`: no tiene formulario — no se toca, sigue cerrando directo.

### Contraste de "Sign in" (App.tsx)

```tsx
<SignInButton mode="modal">
  <button className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition">
    Sign in
  </button>
</SignInButton>
```
(Clerk's `SignInButton` acepta un hijo custom como trigger; el texto se mantiene igual, solo se le da el mismo tratamiento visual de píldora blanca que el resto de botones del nav.)

## Errores

Ninguno de estos cambios introduce nuevas rutas de error — son ajustes de layout/CSS y una confirmación de navegador nativa (`window.confirm`), sin nuevas llamadas a Supabase ni nuevos estados de carga.

## Testing

- `npx tsc --noEmit` para verificación de tipos en cada tarea.
- Verificación manual con Playwright a viewport 390×844, en las vistas ya usadas para el análisis (Dashboard, Calendario, y los 5 modales) — algunas requieren el bypass temporal de login ya usado varias veces en esta sesión (revertido sin commitear).
- Verificación adicional a un ancho intermedio (por ejemplo 800px) para confirmar que el comportamiento desktop no se rompe con los nuevos breakpoints `sm:`/`md:`.
