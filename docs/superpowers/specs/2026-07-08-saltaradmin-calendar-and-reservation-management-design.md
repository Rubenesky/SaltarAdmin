# SaltarAdmin — Diseño: calendario en español, gestión de reservas y validaciones

## Contexto

Sobre la base ya construida y mergeada de SaltarAdmin (spec anterior: `2026-07-07-saltaradmin-core-app-design.md`), el usuario pidió una segunda tanda de mejoras tras usar la app: localización del calendario, una forma de editar/cancelar reservas existentes desde un punto de entrada dedicado, y cerrar un hueco real de doble reserva que ya se había detectado (pero no arreglado) en la revisión final de la rama anterior.

## Alcance

Esta pasada cubre:
1. Calendario: cabeceras de día con solo el número, idioma español completo.
2. Cierre del hueco de doble reserva en el flujo "Nueva Reserva" del header (el flujo de clic en el calendario ya estaba protegido).
3. Nuevo botón y modal "Gestionar Reservas": editar datos de una reserva o cancelarla.
4. Validación de orden de fechas (`fecha_inicio <= fecha_fin`) en los formularios de reserva y de bloqueo.
5. Buscador por nombre/teléfono en Historial y en Gestionar Reservas.
6. SQL de restricción de solapamiento a nivel de base de datos, entregado como documentación para que el usuario lo aplique manualmente en Supabase (no ejecutable desde este entorno).

Fuera de alcance, explícitamente pospuesto a pedido del usuario: políticas RLS en Supabase, vista de "reservas de hoy", seguimiento de pagos, revisión de uso en móvil.

## Diseño

### 1. Calendario: formato de día y localización

- Importar `esLocale` desde `@fullcalendar/core/locales/es` y pasarlo como prop `locale={esLocale}` a `<FullCalendar>`. Esto traduce automáticamente los nombres de mes y los textos de los botones del header ("today" → "Hoy", "month" → "Mes") sin necesidad de traducir manualmente.
- Añadir `slotLabelFormat={{ day: 'numeric' }}` para que las cabeceras de columna muestren solo el número de día (ej. "8"), sin la letra del día de la semana.

### 2. Cierre del hueco de doble reserva

- Nueva función en `src/lib/supabase.ts`: `hayConflictoReserva(articuloId, fechaInicio, fechaFin, excluirReservaId?)`. Consulta `reservas` filtrando por `articulo_id`, excluyendo `estado = 'cancelada'`, y comprobando solapamiento de rango de fechas (`fecha_inicio < fechaFin AND fecha_fin > fechaInicio`). Si se pasa `excluirReservaId`, esa reserva se excluye de la comprobación (para permitir editar una reserva sin que choque consigo misma).
- Se usa en `ReserveModal.tsx`, únicamente en el modo standalone (`!contextoFijo`, el que se abre desde el botón "Nueva Reserva" del header): antes de llamar a `createReserva`, se comprueba `hayConflictoReserva`; si devuelve `true`, se muestra un error ("Ya existe una reserva para ese artículo en esas fechas.") y no se guarda.
- El flujo de clic en una celda del calendario (`contextoFijo`) no necesita este chequeo adicional: `selectOverlap={false}` en `Calendar.tsx` ya impide seleccionar una celda que se solape con una reserva existente a nivel de interacción de FullCalendar.
- También se usa en el formulario de edición de "Gestionar Reservas" (sección 3) cuando se cambian fechas o artículo, excluyendo la propia reserva que se está editando.

### 3. Nuevo botón y modal "Gestionar Reservas"

- Nuevo botón en el header de `App.tsx`, entre "📅 Nueva Reserva" y "📋 Historial": **"📝 Gestionar Reservas"**.
- Nuevo componente `src/components/GestionarReservasModal.tsx`, props `{ isOpen, onClose, onReservasChanged }`.
- Al abrir, carga las reservas vía la función `getReservas()` ya existente (devuelve `ReservaConArticulo[]` con el nombre del artículo embebido) y filtra en el propio componente las que no estén `cancelada` — es una vista de trabajo sobre reservas activas, no un archivo histórico (para eso ya está Historial).
- Cada fila muestra cliente, artículo, fechas, estado, y dos botones: **"✏️ Editar"** y **"❌ Cancelar"**.
- "✏️ Editar" despliega un formulario en la propia fila (o justo debajo) con los campos precargados: nombre, teléfono, email, fecha inicio, fecha fin, notas. Al guardar:
  1. Valida `fecha_inicio <= fecha_fin` (ver sección 4).
  2. Llama a `hayConflictoReserva(articulo_id, fecha_inicio, fecha_fin, id)` (excluyendo la propia reserva); si hay conflicto, muestra error y no guarda.
  3. Llama a la nueva función `updateReserva(id, { cliente_nombre, cliente_telefono, cliente_email, fecha_inicio, fecha_fin, notas })` en `src/lib/supabase.ts`.
  4. Recarga la lista y llama a `onReservasChanged` (reutiliza el mismo patrón de refresco que ya usan los demás modales, para que el calendario se actualice).
- "❌ Cancelar" reutiliza `updateReservaEstado(id, 'cancelada')`, ya existente — mismo mecanismo que el botón "Cancelar Reserva" de Historial.
- No se reutiliza `ReserveModal` para editar: ese componente está diseñado específicamente para crear (llama a `createReserva`); mezclar modos de creación y edición ahí complicaría el componente sin necesidad. El formulario de edición vive directamente en `GestionarReservasModal`.

### 4. Validación de orden de fechas

- En `ReserveModal.tsx` (modo standalone) y en el formulario de bloqueos de `ArticleDetailModal.tsx`: antes de guardar, comprobar que la fecha de inicio no sea posterior a la de fin (comparación de strings `YYYY-MM-DD`, válida para este formato). Si falla, mostrar error y no enviar.
- Misma validación en el formulario de edición de `GestionarReservasModal`.
- No aplica al flujo de clic en el calendario (`contextoFijo`): esas fechas las genera FullCalendar directamente a partir de la selección del usuario, siempre en orden correcto.

### 5. Buscador en Historial y Gestionar Reservas

- `ReservationHistory.tsx`: nuevo campo de texto sobre la tabla, estado local `searchTerm`. Filtra el array de reservas ya cargado en memoria por coincidencia (sin distinguir mayúsculas/minúsculas) en `cliente_nombre` o `cliente_telefono`. No dispara peticiones nuevas a Supabase.
- `GestionarReservasModal.tsx`: mismo patrón, con su propio estado local.

### 6. Restricción de solapamiento a nivel de base de datos (entregable para el usuario)

Se crea un archivo `docs/supabase-exclusion-constraint.sql` con el SQL y un comentario explicando qué hace y cómo aplicarlo manualmente desde el editor SQL de Supabase:

```sql
-- Habilita el tipo de índice necesario para la restricción (una sola vez por proyecto)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Impide dos reservas activas (no canceladas) del mismo artículo con fechas solapadas,
-- como garantía a nivel de base de datos además de la validación que ya hace la app.
ALTER TABLE reservas
  ADD CONSTRAINT no_solapamiento_reservas
  EXCLUDE USING gist (
    articulo_id WITH =,
    daterange(fecha_inicio, fecha_fin, '[]') WITH &&
  )
  WHERE (estado <> 'cancelada');
```

**Aviso incluido en el archivo:** si ya existieran en la tabla `reservas` dos reservas activas que se solapan entre sí, este `ALTER TABLE` fallará al crearse. No se aplica automáticamente desde este entorno — es responsabilidad del usuario ejecutarlo en el panel de Supabase cuando quiera activar esta protección adicional.

## Estructura de archivos

- Modificar: `src/lib/supabase.ts` (añadir `updateReserva`, `hayConflictoReserva`)
- Modificar: `src/components/Calendar.tsx` (locale + `slotLabelFormat`)
- Modificar: `src/components/ReserveModal.tsx` (validación de fechas + chequeo de solapamiento en modo standalone)
- Modificar: `src/components/ArticleDetailModal.tsx` (validación de fechas en el formulario de bloqueo)
- Modificar: `src/components/ReservationHistory.tsx` (buscador)
- Crear: `src/components/GestionarReservasModal.tsx`
- Modificar: `src/App.tsx` (nuevo botón + modal)
- Crear: `docs/supabase-exclusion-constraint.sql`

## Testing / verificación

- Igual que en la spec anterior: no hay suite de tests automatizados en el proyecto. Verificación mediante `npx tsc --noEmit`, `npm run build`, y prueba manual en navegador real (incluyendo Playwright si está disponible) cubriendo: calendario en español con solo número de día; crear una reserva desde "Nueva Reserva" del header que se solape con una existente y confirmar que se bloquea con mensaje de error; abrir "Gestionar Reservas", editar una reserva (cambiar teléfono y fechas) y confirmar que se refleja en el calendario e Historial; cancelar una reserva desde Gestionar Reservas y confirmar que la celda vuelve a verde; probar el buscador en Historial y Gestionar Reservas; intentar crear un bloqueo o reserva con fecha fin anterior a fecha inicio y confirmar que se bloquea.
