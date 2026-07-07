# SaltarAdmin — Diseño: completar y arreglar la app de gestión de stock/reservas

## Contexto

SaltarAdmin es una app de gestión de stock y reservas para Saltarines (alquiler de colchones/eventos). Stack: React 18 + TypeScript + Vite, Tailwind, shadcn/ui, Clerk (auth), Supabase (Postgres), FullCalendar (resource-timeline), deploy en Vercel.

El proyecto ya tiene una base de código parcial (login, conexión a Supabase, calendario y modales iniciales), pero una auditoría del código actual encontró varios bugs reales que impiden que la app funcione como se pretende. Se confirmó contra la base de datos real (vía API REST de Supabase) que:

- La tabla `reservas` tiene **0 filas** — nunca se ha guardado una reserva con éxito.
- La tabla `articulos` tiene datos reales con valores de `categoria` inconsistentes en texto libre (sin constraint de BD), confirmando que la columna acepta cualquier texto.

## Bugs encontrados en el código actual

1. `ReserveModal.tsx` inserta el campo `cliente` pero el esquema real de `reservas` tiene `cliente_nombre` → el insert falla y el error se descarta en silencio (`if (!error)` nunca lanza excepción, así que no hay `console.error`).
2. `ReservationHistory.tsx` llama a `.innerJoin(...)`, método que no existe en `supabase-js` → rompe en tiempo de ejecución. Además referencia `reserva.cliente` y `reserva.articulo.nombre`, campos que no existen con ese shape.
3. `Calendar.tsx` usa `initialView="resourceTimelineDay"` en vez de mes; no filtra artículos por `estado='disponible'`; no pinta celdas libres en verde; no tiene click en nombre de artículo.
4. `ManageArticleModal.tsx` solo tiene formulario de creación; no lista artículos existentes ni permite editar su estado.
5. `src/hooks/useSupabase.ts` es código muerto: importa `getArticles`, `getReservations`, `createReservation`, `createArticle`, funciones que no existen en `src/lib/supabase.ts` (que exporta `getArticulos`, `getReservas`, `createReserva`, `createArticulo`). Ningún componente lo usa — todos importan el `useSupabase()` trivial definido en `lib/supabase.ts`.
6. `path/to/filename.js`, archivo basura con contenido placeholder, está `staged` en git — residuo accidental de una sesión anterior.
7. `.gitignore` solo contiene `.aider*` — no excluye `node_modules/`, `dist/` ni `.env.local`. Riesgo real de commitear credenciales de Supabase/Clerk.
8. `package.json` no tiene script `build` ni `preview`, necesarios para el deploy en Vercel.
9. Falta `ArticleDetailModal.tsx` (mencionado en el flujo pero no creado).

## Alcance

Esta pasada cubre: arreglar los bugs anteriores + completar las 8 secciones de funcionalidad ya especificadas por el usuario, **incluyendo funcionalidad completa de bloqueos** (tabla `bloqueos`, antes fuera de las 8 secciones numeradas, ahora incluida a pedido del usuario).

Fuera de alcance (no pedido, no se toca): edición de reservas ya creadas más allá de cambiar su `estado`; eliminar artículos (solo cambiar estado a `baja`); notificaciones/emails; roles de usuario más allá de lo que ya da Clerk.

## Diseño

### 1. Limpieza y capa de datos

- Eliminar `path/to/filename.js` y `src/hooks/useSupabase.ts`.
- Consolidar todo el acceso a datos en `src/lib/supabase.ts`: cliente Supabase + funciones tipadas:
  - `getArticulos()`, `getReservas()`, `getBloqueos(articuloId?)`
  - `createArticulo(articulo)`, `updateArticuloEstado(id, estado)`
  - `createReserva(reserva)`, `updateReservaEstado(id, estado)`
  - `createBloqueo(bloqueo)`, `deleteBloqueo(id)`
- Los componentes importan estas funciones y el `supabase` client directamente; se elimina el envoltorio `useSupabase()` (era solo `return { supabase }`, indirección sin valor).
- Nuevo `src/types.ts` con interfaces `Articulo`, `Reserva`, `Bloqueo` reflejando el esquema real (incluye `cliente_nombre`, no `cliente`). Sustituye los `any[]` actuales.
- Arreglar el insert de `ReserveModal` para usar `cliente_nombre`.
- `.gitignore`: añadir `node_modules/`, `dist/`, `.env.local`, `.env*.local`.
- `package.json`: añadir `"build": "tsc -b && vite build"` y `"preview": "vite preview"`.

### 2. Calendario (`Calendar.tsx`)

- Vista `resourceTimelineMonth`. Recursos = artículos con `estado='disponible'` únicamente (se filtran mantenimiento/baja).
- **Técnica de coloreado** (evaluada contra alternativa de grid CSS propio; se elige esta por ser el patrón nativo de FullCalendar, requiere menos CSS custom y mantiene el `select` de celda funcionando):
  - Por cada artículo, un evento `display: 'background'` verde que cubre el rango visible del mes actual. Se recalcula en el callback `datesSet` cuando el usuario navega entre meses.
  - Reservas: eventos normales rojos (`backgroundColor: '#dc2626'`), posicionados por `articulo_id` + `fecha_inicio`/`fecha_fin`.
  - Bloqueos: eventos normales grises (`backgroundColor: '#9ca3af'`), mismo mecanismo que reservas, para distinguirlos visualmente de "reservado".
- Interacciones:
  - Click en celda vacía (sin evento encima) → abre `ReserveModal` con el artículo y fecha de esa celda.
  - Click en el nombre del artículo (resource label) → abre `ArticleDetailModal`.
  - Click en un evento de reserva (rojo) → popover rápido (no modal) con cliente, teléfono, fechas y estado de esa reserva.
- Header: botones prev/next/today + título del mes, como ya existe.

### 3. Modales

**`ReserveModal.tsx`**
- Corrige el insert (`cliente_nombre`).
- Muestra como contexto (no editable) el artículo y fecha ya seleccionados.
- Captura y muestra el error de Supabase en el propio modal si el insert falla, en vez de fallar en silencio.
- Resto según spec original: nombre, teléfono, email opcional, notas opcional; botones "✅ Crear Reserva" / "Cancelar".

**`ManageArticleModal.tsx`**
- Añade lista de artículos existentes (nombre, categoría, estado) con un `<select>` inline por fila para cambiar `estado` (dispara `updateArticuloEstado`).
- Mantiene el formulario "➕ Nuevo Artículo" ya existente.
- Categorías del `<select>` actualizadas a los valores con tilde pedidos: colchón viscoelástico, colchón muelles, colchón látex, toro mecánico, fiesta espuma, otro (verificado que la columna es texto libre, sin constraint que lo bloquee).

**`ArticleDetailModal.tsx` (nuevo)**
- Muestra nombre, categoría, estado actual del artículo.
- Tabla de historial de reservas de ese artículo (cliente, fechas, estado).
- Sección de bloqueos: lista de bloqueos existentes (fecha_inicio, fecha_fin, motivo) con botón eliminar por fila; formulario para crear uno nuevo (fecha_inicio, fecha_fin, motivo).
- Botón "Cerrar".

### 4. Historial (`ReservationHistory.tsx`)

- Reemplaza `.innerJoin()` (inexistente) por el embed nativo de Supabase: `select('*, articulos(nombre)')`.
- Corrige referencias de campo (`cliente_nombre` en vez de `cliente`).
- Añade `<select>` de estado por fila (dispara `updateReservaEstado`) y botón dedicado "Cancelar Reserva" (pone `estado='cancelada'` directamente).
- Colores por estado ya definidos en el spec original (pendiente=amarillo, confirmada=verde, cancelada=rojo, completada=azul).

### 5. Layout y estilo global (`App.tsx`)

- Header con gradiente `from-blue-700 to-orange-500`, título "🗄️ SaltarAdmin" a la izquierda.
- Botones del header: "📅 Nueva Reserva" (verde, nuevo — hoy solo se puede reservar desde el calendario, no desde el header), "📋 Historial" (azul, toggle), "⚙️ Gestionar Artículos" (gris), `UserButton` de Clerk.
- Fuente Inter, `gap-4`/`gap-6` para espaciado, tarjetas con `shadow-lg` y `rounded-lg`, transiciones suaves en botones y aparición de modales.
- Colores corporativos ya definidos en el spec original (azul `#1a56db`, naranja `#ed8936`, verde `#16a34a`, rojo `#dc2626`, gris claro `#f3f4f6`).
- Responsive para móvil/tablet/escritorio.

### Testing / verificación

- Verificación manual en navegador (`npm run dev`) del flujo completo: login → ver calendario con celdas verdes → crear reserva desde celda → celda se pinta roja → ver en historial → cambiar estado → ver reflejado en calendario. Crear artículo, cambiar su estado, verificar que desaparece del calendario si pasa a mantenimiento/baja. Crear y eliminar un bloqueo desde `ArticleDetailModal`, verificar que se pinta gris en el calendario.
- `npm run build` debe completar sin errores de TypeScript antes de dar por terminado (requisito de deploy en Vercel).
- No se añaden tests automatizados (no hay suite de testing configurada en el proyecto; fuera de alcance de esta pasada).
