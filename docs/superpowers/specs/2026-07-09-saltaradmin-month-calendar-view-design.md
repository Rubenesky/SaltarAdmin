# SaltarAdmin — Vista "Calendario" (mensual, por día) — Design

**Date:** 2026-07-09
**Status:** Approved

## Motivación

El Dashboard actual (`Calendar.tsx`, vista `resourceTimelineMonth`) muestra los artículos en filas y los días en columnas — ideal para ver disponibilidad por artículo y crear reservas rápido pinchando una celda. Pero no hay forma rápida de responder "¿qué reservas hay el día X, sin importar el artículo?" sin escanear toda la cuadrícula horizontal.

Se añade una nueva pestaña "Calendario" con un calendario mensual simple (solo números de día, sin eventos dibujados en las celdas) donde pinchar un día abre una ventana flotante de solo lectura con todas las reservas activas de ese día, con todos sus detalles.

El Dashboard actual **no cambia**. Esta es una vista adicional, no un reemplazo.

## Alcance

- Nueva vista mensual de solo consulta (no permite crear/editar/cancelar reservas).
- Navegación entre meses (flechas prev/next, más botón "Hoy"), igual que el Dashboard.
- Un nuevo botón de navegación "📆 Calendario" entre "🏠 Dashboard" y "📅 Nueva Reserva".

Fuera de alcance (decidido explícitamente durante el brainstorming):
- Indicadores visuales (puntos, contadores) en los días con reservas — se mantiene el grid limpio, solo números.
- Reservas canceladas en la lista del día.
- Acciones de click sobre una reserva individual dentro del modal del día (editar/cancelar) — para eso se sigue usando "Gestionar Reservas".

## Enfoque técnico

Se reutiliza FullCalendar con la vista `dayGridMonth` (plugin `@fullcalendar/daygrid`, ya instalado en `package.json` pero sin usar hasta ahora). Se reutiliza el locale español (`@fullcalendar/core/locales/es`) y el plugin de interacción (`@fullcalendar/interaction`, ya instalado) para el evento `dateClick`.

Se descartó construir un grid mensual a mano (cálculo manual de semanas/días): reinventa algo que FullCalendar ya resuelve y no aporta beneficio real más allá de un parecido visual más exacto con una captura de referencia (el selector nativo de fecha del navegador), que no es un requisito funcional.

## Componentes

### `src/components/MonthCalendarView.tsx` (nuevo)

Autocontenido — no recibe props desde `App.tsx`.

- Al montar, carga `getReservas()` (de `src/lib/supabase.ts`, ya existente — devuelve `ReservaConArticulo[]` con el nombre del artículo ya unido).
- Renderiza `FullCalendar` con `plugins={[dayGridPlugin, interactionPlugin]}`, `initialView="dayGridMonth"`, `locale={esLocale}`, `headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}`.
- `dateClick` guarda la fecha pinchada (`YYYY-MM-DD`) en estado local y abre `DayReservationsModal`.
- Filtra `reservas` para esa fecha en el propio componente (ver "Filtrado por día" abajo) y se lo pasa como prop a `DayReservationsModal`.
- Maneja error de carga igual que `Calendar.tsx`: mensaje visible, no rompe el resto de la vista.

### `src/components/DayReservationsModal.tsx` (nuevo)

Modal de solo lectura. Mismo patrón de cierre que los otros 4 modales de la app (fondo oscuro con `onClick={onClose}`, tarjeta interior con `onClick={(e) => e.stopPropagation()}`, botón "✕" con `aria-label="Cerrar"`).

Props:
```ts
interface DayReservationsModalProps {
  isOpen: boolean
  onClose: () => void
  fecha: string // 'YYYY-MM-DD'
  reservas: ReservaConArticulo[] // ya filtradas para ese día, por MonthCalendarView
}
```

Contenido:
- Título: fecha formateada con `formatFecha()` (de `src/lib/format.ts`, ya existente — `dd-mm-yyyy`).
- Si `reservas.length === 0`: texto "No hay reservas este día."
- Si no, una lista (`<ul>`) con una entrada por reserva, mostrando:
  - `cliente_nombre` · `reserva.articulos?.nombre ?? '—'`
  - 📞 `cliente_telefono`
  - ✉️ `cliente_email` (solo si existe)
  - 📅 `formatFecha(fecha_inicio)` → `formatFecha(fecha_fin)`
  - Estado: `estado` (capitalizado vía CSS, igual que el popover del Dashboard)
  - 📝 `notas` (solo si existe)
- Sin botones de acción por reserva (no editar/cancelar — solo consulta).
- Botón "Cerrar" al final, igual que los otros modales.

### Filtrado por día

En `MonthCalendarView.tsx`, cliente-side, usando la misma convención de intervalo semiabierto `[fecha_inicio, fecha_fin)` ya usada en toda la app (`hayConflictoReserva`, eventos de FullCalendar):

```ts
const reservasDelDia = reservas.filter(
  (r) => r.estado !== 'cancelada' && r.fecha_inicio <= fechaSeleccionada && fechaSeleccionada < r.fecha_fin
)
```

No se necesita ninguna función nueva en `src/lib/supabase.ts` — `getReservas()` ya trae todo lo necesario.

## Navegación (`src/App.tsx`)

El estado actual `showHistorial: boolean` no soporta 3 vistas mutuamente excluyentes. Se reemplaza por:

```ts
type Vista = 'dashboard' | 'calendario' | 'historial'
const [vista, setVista] = useState<Vista>('dashboard')
```

- El título "🗄️ SaltarAdmin" y el botón "🏠 Dashboard" hacen `setVista('dashboard')` (antes `setShowHistorial(false)`).
- El botón "📋 Historial" pasa de `setShowHistorial((prev) => !prev)` a `setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial'))` para mantener el mismo comportamiento de toggle.
- Nuevo botón "📆 Calendario" hace `setVista('calendario')`, ubicado en el nav entre "🏠 Dashboard" y "📅 Nueva Reserva".
- El área `<main>` renderiza según `vista`:
  ```tsx
  {vista === 'historial' ? (
    <ReservationHistory key={`historial-${refreshKey}`} />
  ) : vista === 'calendario' ? (
    <MonthCalendarView key={`mes-${refreshKey}`} />
  ) : (
    <Calendar key={`calendario-${refreshKey}`} onCeldaClick={handleCeldaClick} onArticuloClick={handleArticuloClick} />
  )}
  ```
- `handleNuevaReservaClick` (el botón "📅 Nueva Reserva") sigue sin tocar `vista` en su forma actual salvo que ya hacía `setShowHistorial(false)` al principio — se cambia a `setVista('dashboard')` para mantener el comportamiento (vuelve al Dashboard al crear una reserva desde el botón de header, igual que antes).

## Errores

Igual que el resto de vistas: fallo de carga de `getReservas()` en `MonthCalendarView` se captura y muestra un mensaje de error visible dentro de la vista (no rompe el resto de la app).

## Testing

- `npx tsc --noEmit` para verificación de tipos.
- Verificación manual en vivo con Playwright (esta vista no requiere login, igual que `Calendar.tsx`):
  - Click en un día con reservas → se abre `DayReservationsModal` con los detalles correctos.
  - Click en un día sin reservas → se abre igual, mostrando "No hay reservas este día."
  - Click en el fondo / botón X → se cierra el modal.
  - Navegación prev/next mes funciona y el título se actualiza.
  - El botón "📆 Calendario" del nav cambia a esta vista; "🏠 Dashboard" y el título vuelven al Dashboard.
