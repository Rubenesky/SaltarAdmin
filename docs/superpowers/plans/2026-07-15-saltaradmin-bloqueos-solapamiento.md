# Bloqueos de mantenimiento sin comprobar solapamiento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Task 2 requiere al humano en el bucle** (acceso al SQL Editor de Supabase y a su sesión real de Clerk) — no se puede delegar a un subagente fresco. La sesión controladora debe ejecutarla directamente.

**Goal:** Cerrar el bloqueante #3 de la auditoría de 11 expertos: que crear un bloqueo de mantenimiento compruebe solapamiento contra reservas confirmadas y contra otros bloqueos, con una restricción de base de datos como cortafuegos para bloqueo-contra-bloqueo.

**Architecture:** Renombrar la función de comprobación de disponibilidad ya existente (`hayConflictoReserva` → `hayConflictoDisponibilidad`, sin cambio de lógica) para reflejar que ahora la usan tanto reservas como bloqueos, añadir su uso a la creación de bloqueos junto con la misma validación de fechas y manejo de `23P01` ya establecidos en el bloqueante #2, y aplicar una restricción de exclusión de base de datos sobre `bloqueos` (mismo patrón que `reservas`, sin cláusula de estado).

**Tech Stack:** React + TypeScript, Supabase JS (Postgrest), PostgreSQL (`EXCLUDE USING gist`).

## Global Constraints

- La restricción de base de datos solo cubre bloqueo-contra-bloqueo (mismo artículo) — el caso cruzado reserva-bloqueo sigue dependiendo de la comprobación en el cliente, por la limitación de los `EXCLUDE constraint` de Postgres a una sola tabla. No se implementa ningún trigger.
- El manejo de `23P01` debe seguir el mismo patrón ya usado en `ManageArticleModal.tsx:108-115` y `ReserveModal.tsx`: extraer `(err as { code?: string })?.code` y comparar con `===`.
- El comportamiento de creación y edición de reservas (`ReserveModal.tsx`, `GestionarReservasModal.tsx`) no debe cambiar — solo se renombra la función que ya usan, sin tocar su lógica.
- Ningún otro archivo de UI cambia.

---

### Task 1: Renombrar la función de comprobación + comprobación de conflicto al crear bloqueos

**Files:**
- Modify: `src/lib/supabase.ts:139` (rename)
- Modify: `src/components/ReserveModal.tsx:2,77` (actualizar import y llamada)
- Modify: `src/components/GestionarReservasModal.tsx:2,77` (actualizar import y llamada)
- Modify: `src/components/ArticleDetailModal.tsx:2,46,51-57,63-64` (import, validación de fechas, comprobación de conflicto, manejo de 23P01)

**Interfaces:**
- Produces: `hayConflictoDisponibilidad(articuloId: string, fechaInicio: string, fechaFin: string, excluirReservaId?: string): Promise<boolean>` — mismo cuerpo, mismo tipo de retorno que la función renombrada; el parámetro `excluirReservaId` sigue existiendo (solo lo usa `GestionarReservasModal.tsx` al editar), no se usa al crear bloqueos.

- [ ] **Step 1: Renombrar la función en `src/lib/supabase.ts`**

Localizar la línea 139 (`export const hayConflictoReserva = async (`) y cambiarla a:

```ts
export const hayConflictoDisponibilidad = async (
```

El resto de la función (líneas 140-165 en el estado actual) no cambia.

- [ ] **Step 2: Actualizar `src/components/ReserveModal.tsx`**

Cambiar la línea 2:

```ts
import { createReserva, getArticulosDisponibles, hayConflictoReserva } from '../lib/supabase'
```

por:

```ts
import { createReserva, getArticulosDisponibles, hayConflictoDisponibilidad } from '../lib/supabase'
```

Y la línea 77:

```ts
      const conflicto = await hayConflictoReserva(finalArticuloId, finalFechaInicio, finalFechaFin)
```

por:

```ts
      const conflicto = await hayConflictoDisponibilidad(finalArticuloId, finalFechaInicio, finalFechaFin)
```

- [ ] **Step 3: Actualizar `src/components/GestionarReservasModal.tsx`**

Cambiar la línea 2:

```ts
import { getReservas, hayConflictoReserva, updateReserva, updateReservaEstado } from '../lib/supabase'
```

por:

```ts
import { getReservas, hayConflictoDisponibilidad, updateReserva, updateReservaEstado } from '../lib/supabase'
```

Y la línea 77:

```ts
      const conflicto = await hayConflictoReserva(reserva.articulo_id, editInicio, editFin, reserva.id)
```

por:

```ts
      const conflicto = await hayConflictoDisponibilidad(reserva.articulo_id, editInicio, editFin, reserva.id)
```

- [ ] **Step 4: Actualizar `src/components/ArticleDetailModal.tsx`**

Cambiar la línea 2:

```ts
import { createBloqueo, deleteBloqueo, getBloqueos, getReservasPorArticulo } from '../lib/supabase'
```

por:

```ts
import { createBloqueo, deleteBloqueo, getBloqueos, getReservasPorArticulo, hayConflictoDisponibilidad } from '../lib/supabase'
```

Reemplazar el método `handleCrearBloqueo` completo (líneas 42-66 en el estado actual):

```ts
  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (nuevoInicio > nuevoFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }

    try {
      await createBloqueo({
        articulo_id: articulo.id,
        fecha_inicio: nuevoInicio,
        fecha_fin: nuevoFin,
        motivo: nuevoMotivo,
      })
      setNuevoInicio('')
      setNuevoFin('')
      setNuevoMotivo('')
      await cargarDatos()
      onBloqueosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el bloqueo.')
    }
  }
```

por:

```ts
  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (nuevoInicio >= nuevoFin) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin.')
      return
    }

    try {
      const conflicto = await hayConflictoDisponibilidad(articulo.id, nuevoInicio, nuevoFin)
      if (conflicto) {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
        return
      }

      await createBloqueo({
        articulo_id: articulo.id,
        fecha_inicio: nuevoInicio,
        fecha_fin: nuevoFin,
        motivo: nuevoMotivo,
      })
      setNuevoInicio('')
      setNuevoFin('')
      setNuevoMotivo('')
      await cargarDatos()
      onBloqueosChanged()
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23P01') {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear el bloqueo.')
      }
    }
  }
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores. Si aparece algún error de nombre no encontrado, revisar que no quede ninguna referencia a `hayConflictoReserva` sin renombrar — buscar con `grep -rn "hayConflictoReserva" src/` y confirmar que no hay resultados (el nombre nuevo es `hayConflictoDisponibilidad` en todos los sitios).

- [ ] **Step 6: Verificar en vivo sin necesidad de sesión real (regresión estructural)**

Arrancar `npm run dev`, abrir la app con el bypass temporal `{true || isSignedIn}` en `src/App.tsx` (revertirlo exactamente después, confirmando con `git diff src/App.tsx` que vuelve a vacío antes de continuar). Confirmar con Playwright que:
- El formulario de "Nueva Reserva" sigue abriendo con todos sus campos (el renombrado no debe haber roto nada).
- El modal de detalle de artículo (clic en el nombre de un artículo en el Dashboard) sigue mostrando el formulario de "Añadir Bloqueo" con sus 3 campos (Desde, Hasta, Motivo).

No se puede verificar aquí el rechazo real por conflicto ni por fechas iguales, porque sin sesión real (RLS) no hay artículos ni reservas cargadas — eso se verifica en la Task 2 con datos reales.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/components/ReserveModal.tsx src/components/GestionarReservasModal.tsx src/components/ArticleDetailModal.tsx
git commit -m "fix: check availability conflicts when creating maintenance bloqueos"
```

---

### Task 2: Restricción de base de datos para bloqueos y verificación en vivo con sesión real

**Files:**
- Create: `docs/supabase-bloqueos-exclusion-constraint.sql`

**Interfaces:**
- Consumes: `hayConflictoDisponibilidad` (Task 1), tabla `bloqueos` existente (columnas `articulo_id`, `fecha_inicio`, `fecha_fin`, ya usadas por la restricción equivalente de `reservas`).

**Quién ejecuta esto:** el usuario, con la sesión controladora guiándolo. No delegar a un subagente.

- [ ] **Step 1: Escribir el script SQL**

```sql
-- SaltarAdmin: restricción de no-solapamiento de bloqueos de mantenimiento
-- a nivel de base de datos.
--
-- Mismo patrón que no_solapamiento_reservas (docs/supabase-exclusion-constraint.sql),
-- aplicado a la tabla bloqueos. Sin cláusula WHERE porque bloqueos no tiene
-- campo de estado/cancelado.
--
-- No cubre el caso cruzado reserva-bloqueo: un EXCLUDE constraint de Postgres
-- solo compara filas de la misma tabla. Ese caso sigue dependiendo de
-- hayConflictoDisponibilidad en el cliente (src/lib/supabase.ts).
--
-- CÓMO APLICARLA: copia y pega este archivo completo en el editor SQL de
-- Supabase (Dashboard → SQL Editor → New query) y ejecútalo una sola vez.
-- Requiere la extensión btree_gist, ya habilitada por
-- docs/supabase-exclusion-constraint.sql.

ALTER TABLE bloqueos
  ADD CONSTRAINT no_solapamiento_bloqueos
  EXCLUDE USING gist (
    articulo_id WITH =,
    daterange(fecha_inicio, fecha_fin, '[)') WITH &&
  );
```

- [ ] **Step 2: Commit del script**

```bash
git add docs/supabase-bloqueos-exclusion-constraint.sql
git commit -m "docs: add DB exclusion constraint script for bloqueos"
```

- [ ] **Step 3: Aplicar la restricción**

En el panel de Supabase → **SQL Editor** → **New query** → pegar el contenido completo de `docs/supabase-bloqueos-exclusion-constraint.sql` → **Run**. Si aparece un error de que ya existen bloqueos solapados para el mismo artículo, habría que corregirlos manualmente antes de poder aplicar la restricción; si no hay bloqueos de prueba pendientes de rondas anteriores, no debería ocurrir.

- [ ] **Step 4: Verificar el conflicto reserva-contra-bloqueo con sesión real**

Con sesión real de Clerk iniciada: crear una reserva de prueba para un artículo en un rango de fechas concreto. Después, abrir el detalle de ese mismo artículo e intentar crear un bloqueo de mantenimiento que se solape con esas fechas. Confirmar que se rechaza con "Ese artículo no está disponible en esas fechas (ya reservado o bloqueado)." y que no se crea el bloqueo.

- [ ] **Step 5: Verificar el conflicto bloqueo-contra-bloqueo**

Crear un bloqueo de mantenimiento válido para un artículo (sin conflicto). Intentar crear un segundo bloqueo para el mismo artículo en fechas que se solapen con el primero. Confirmar que se rechaza igual.

- [ ] **Step 6: Verificar la validación de fechas iguales**

Intentar crear un bloqueo con la misma fecha en "Desde" y "Hasta". Confirmar que se rechaza con "La fecha de inicio debe ser anterior a la fecha de fin."

- [ ] **Step 7: Confirmar que los flujos existentes siguen funcionando**

Crear una reserva de prueba válida (sin conflicto) y editar una reserva existente cambiándole las fechas a un rango también válido. Confirmar que ambas operaciones funcionan sin errores (verifica que el renombrado de la Task 1 no rompió nada).

- [ ] **Step 8: Limpiar los datos de prueba**

Cancelar las reservas de prueba y eliminar los bloqueos de prueba creados en los Steps 4-7.

- [ ] **Step 9: Reportar el resultado al usuario**

Resumen de qué se verificó y el resultado de cada paso — sin necesidad de commit adicional (los cambios de archivo de esta task ya se commitearon en el Step 2).
