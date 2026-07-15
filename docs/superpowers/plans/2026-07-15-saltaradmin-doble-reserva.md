# Comprobación de doble reserva en el flujo principal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Task 2 requiere al humano en el bucle** (acceso al SQL Editor de Supabase y a su sesión real de Clerk) — no se puede delegar a un subagente fresco. La sesión controladora debe ejecutarla directamente.

**Goal:** Cerrar el bloqueante #2 de la auditoría de 11 expertos: que la comprobación de conflicto de reservas se ejecute siempre, sin importar la vía de creación, con la restricción de base de datos como último cortafuegos real.

**Architecture:** Quitar el condicional que salta la comprobación de conflicto en la vía de creación por arrastre en el calendario, endurecer la validación de fechas iguales, capturar el código de error `23P01` de Postgres con el mismo patrón ya usado en el proyecto para `23503`, y aplicar la restricción de exclusión de base de datos que nunca se llegó a ejecutar.

**Tech Stack:** React + TypeScript, Supabase JS (Postgrest), PostgreSQL (constraint `EXCLUDE USING gist`).

## Global Constraints

- No se debe cambiar el comportamiento del flujo del formulario independiente ("Nueva Reserva") — solo se añade la misma comprobación que ya tenía a la vía de arrastre en el calendario.
- El manejo del error `23P01` debe seguir exactamente el patrón ya usado en `src/components/ManageArticleModal.tsx:108-115` para el código `23503`: extraer `(err as { code?: string })?.code` y comparar con `===`.
- Fuera de alcance: los bloqueos de mantenimiento (`ArticleDetailModal.tsx`) — bloqueante #3 de la auditoría, otra ronda.
- Ningún otro archivo de UI cambia.

---

### Task 1: Comprobación de conflicto siempre activa + validación de fechas + manejo de 23P01

**Files:**
- Modify: `src/components/ReserveModal.tsx:70` (validación de fechas)
- Modify: `src/components/ReserveModal.tsx:77-83` (comprobación de conflicto)
- Modify: `src/components/ReserveModal.tsx:96-97` (manejo de error en el catch)

**Interfaces:**
- Consumes: `hayConflictoReserva(articuloId: string, fechaInicio: string, fechaFin: string): Promise<boolean>` (ya existe en `src/lib/supabase.ts`, sin cambios).
- Produces: ningún cambio de interfaz pública — `ReserveModalProps` no cambia.

- [ ] **Step 1: Reemplazar el bloque `handleSubmit` completo**

Localizar en `src/components/ReserveModal.tsx` el método `handleSubmit` (líneas 57-101 en el estado actual del archivo) y reemplazar exactamente estas tres partes:

Reemplazar la línea 70:

```ts
    if (finalFechaInicio > finalFechaFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }
```

por:

```ts
    if (finalFechaInicio >= finalFechaFin) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin.')
      return
    }
```

(El mensaje cambia de "no puede ser posterior" a "debe ser anterior" porque ahora también se rechazan las fechas iguales, y "posterior" sería impreciso para ese caso.)

Reemplazar las líneas 77-83:

```ts
      if (!contextoFijo) {
        const conflicto = await hayConflictoReserva(finalArticuloId, finalFechaInicio, finalFechaFin)
        if (conflicto) {
          setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
          return
        }
      }
```

por:

```ts
      const conflicto = await hayConflictoReserva(finalArticuloId, finalFechaInicio, finalFechaFin)
      if (conflicto) {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
        return
      }
```

Reemplazar las líneas 96-97:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva.')
```

por:

```ts
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23P01') {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear la reserva.')
      }
```

El resto del archivo (incluida la línea `} finally { setSaving(false) }` que sigue justo después) no cambia.

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Verificar en vivo sin necesidad de sesión real (regresión visual)**

Arrancar `npm run dev`, abrir la app con el bypass temporal `{true || isSignedIn}` en `src/App.tsx` (revertirlo exactamente después, confirmando con `git diff src/App.tsx` que vuelve a vacío antes de continuar). Confirmar con Playwright que:
- El formulario independiente ("Nueva Reserva") sigue abriendo y mostrando los mismos campos que antes.
- Intentar guardar con la fecha "Desde" igual a "Hasta" muestra el mensaje "La fecha de inicio debe ser anterior a la fecha de fin."

Esto no requiere sesión real porque solo se verifica que la UI y la validación de fechas se comportan como se espera — la llamada real a `hayConflictoReserva`/`createReserva` fallará sin sesión (RLS), lo cual es el comportamiento correcto y no se está probando aquí.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReserveModal.tsx
git commit -m "fix: always check for booking conflicts, including calendar-drag creation"
```

---

### Task 2: Aplicar la restricción de base de datos y verificar en vivo con sesión real

**Files:** ninguno (acción en el panel de Supabase + verificación).

**Interfaces:**
- Consumes: `docs/supabase-exclusion-constraint.sql` (ya existe en el repo, sin cambios).

**Quién ejecuta esto:** el usuario, con la sesión controladora guiándolo. No delegar a un subagente.

- [ ] **Step 1: Aplicar la restricción de exclusión**

En el panel de Supabase → **SQL Editor** → **New query** → pegar el contenido completo de `docs/supabase-exclusion-constraint.sql` → **Run**. Confirmar que no hay errores (el propio archivo ya documenta el único caso de error esperable: que ya existan dos reservas activas solapadas para el mismo artículo, en cuyo caso habría que corregirlas manualmente antes de poder aplicar la restricción — dado que los datos de prueba de la verificación anterior ya se limpiaron, esto no debería ocurrir).

- [ ] **Step 2: Verificar que la comprobación de conflicto funciona en el flujo de arrastre en el calendario**

Con sesión real de Clerk iniciada (sin ningún bypass en el código): crear una reserva de prueba para un artículo en un rango de fechas concreto. Después, intentar crear una segunda reserva para el **mismo artículo** en fechas que se solapen, esta vez **arrastrando sobre la celda del calendario** (no desde "Nueva Reserva"). Confirmar que se rechaza con el mensaje "Ese artículo no está disponible en esas fechas (ya reservado o bloqueado)." y que no se crea la segunda reserva.

- [ ] **Step 3: Verificar la validación de fechas iguales con sesión real**

Intentar crear una reserva (por cualquiera de las dos vías) con la misma fecha en "Desde" y "Hasta". Confirmar que se rechaza con "La fecha de inicio debe ser anterior a la fecha de fin." antes de llegar a hacer ninguna petición de red.

- [ ] **Step 4: Confirmar que el flujo normal sigue funcionando**

Crear una reserva de prueba válida (fechas libres, sin conflicto) por cualquiera de las dos vías. Confirmar que se crea sin errores.

- [ ] **Step 5: Limpiar los datos de prueba**

Cancelar la(s) reserva(s) de prueba creada(s) en los Steps 2 y 4.

- [ ] **Step 6: Reportar el resultado al usuario**

Resumen de qué se verificó y el resultado — sin necesidad de commit (ningún archivo del repo cambia en este task).
