# Aviso de privacidad + borrado real de datos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Task 3 requiere al humano en el bucle** (sesión real de Clerk) — no se puede delegar a un subagente fresco. La sesión controladora debe ejecutarla directamente.

**Goal:** Cerrar el bloqueante #5 de la auditoría de 11 expertos: mostrar un aviso de privacidad real desde el formulario de reserva, y dar al personal una forma real de borrar los datos de un cliente cuando lo pida.

**Architecture:** Un nuevo modal de solo lectura (`PrivacyNoticeModal`) siguiendo el mismo patrón visual que los modales ya existentes, enlazado desde `ReserveModal.tsx`; una nueva función `deleteReserva` que hace un `DELETE` real en la tabla `reservas` (la política RLS `reservas_authenticated_all` ya cubre `DELETE` para usuarios autenticados, así que no hace falta ningún cambio de base de datos), expuesta como un nuevo botón en `ReservationHistory.tsx` junto al ya existente "Cancelar Reserva".

**Tech Stack:** React + TypeScript, Supabase JS.

## Global Constraints

- El texto del aviso usa `[NOMBRE DEL NEGOCIO]` y `[EMAIL DE CONTACTO]` como marcadores de posición visibles — el usuario los rellena después, no es parte de esta implementación.
- El borrado no se restringe por estado de la reserva.
- Ningún cambio de base de datos es necesario para el borrado — la política RLS `for all` ya aplicada en el bloqueante #1 cubre `DELETE`.
- Sin borrado automático programado — solo manual, con confirmación explícita del usuario.

---

### Task 1: Modal de aviso de privacidad + enlace desde el formulario de reserva

**Files:**
- Create: `src/components/PrivacyNoticeModal.tsx`
- Modify: `src/components/ReserveModal.tsx`

**Interfaces:**
- Produces: `PrivacyNoticeModal` — componente `React.FC<{ isOpen: boolean; onClose: () => void }>`, exportado por defecto, sin dependencias de datos (contenido estático).

- [ ] **Step 1: Crear `src/components/PrivacyNoticeModal.tsx`**

```tsx
import React from 'react'

interface PrivacyNoticeModalProps {
  isOpen: boolean
  onClose: () => void
}

const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">🔒 Política de Privacidad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="text-sm text-gray-700 space-y-3">
          <p>
            Al hacer una reserva en [NOMBRE DEL NEGOCIO], recogemos tu nombre, teléfono, y opcionalmente tu
            email y notas sobre el alquiler. Usamos estos datos únicamente para gestionar la reserva y
            contactarte para la entrega y devolución del artículo alquilado.
          </p>
          <p>
            La base legal para tratar estos datos es la ejecución del contrato de alquiler entre tú y
            [NOMBRE DEL NEGOCIO].
          </p>
          <p>
            Conservamos tus datos durante 12 meses desde la fecha de fin del alquiler, salvo que la ley nos
            obligue a conservarlos más tiempo. Pasado ese plazo, los eliminamos.
          </p>
          <p>
            Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos, o borrarlos por completo,
            escribiendo a [EMAIL DE CONTACTO].
          </p>
          <p>
            No incluyas datos de salud u otra información sensible en el campo de notas de tu reserva.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default PrivacyNoticeModal
```

- [ ] **Step 2: Añadir el import en `src/components/ReserveModal.tsx`**

Reemplazar las líneas 1-4:

```ts
import React, { useEffect, useState } from 'react'
import { createReserva, getArticulosDisponibles, hayConflictoDisponibilidad } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import type { Articulo } from '../types'
```

por:

```ts
import React, { useEffect, useState } from 'react'
import { createReserva, getArticulosDisponibles, hayConflictoDisponibilidad } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import PrivacyNoticeModal from './PrivacyNoticeModal'
import type { Articulo } from '../types'
```

- [ ] **Step 3: Añadir el estado del modal**

Reemplazar la línea 36:

```ts
  const [saving, setSaving] = useState(false)
```

por:

```ts
  const [saving, setSaving] = useState(false)
  const [modalPrivacidadOpen, setModalPrivacidadOpen] = useState(false)
```

- [ ] **Step 4: Añadir la advertencia bajo "Notas" y el enlace a la política de privacidad**

Reemplazar (líneas 210-218 en el estado actual):

```tsx
          <div className="mb-4">
            <label htmlFor="notas" className="block text-gray-700">Notas (opcional):</label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
```

por:

```tsx
          <div className="mb-4">
            <label htmlFor="notas" className="block text-gray-700">Notas (opcional):</label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              No incluyas datos de salud u otra información sensible.
            </p>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Al crear la reserva, tratamos estos datos según nuestra{' '}
            <button
              type="button"
              onClick={() => setModalPrivacidadOpen(true)}
              className="text-blue-600 underline hover:text-blue-800"
            >
              política de privacidad
            </button>
            .
          </p>
```

- [ ] **Step 5: Envolver el `return` en un Fragment y renderizar el modal de privacidad**

Reemplazar la apertura del `return` (línea 106-110):

```tsx
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
```

por:

```tsx
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
```

(Nota: al indentar el contenido de este `div` un nivel más por el nuevo `<>`, no hace falta reindentar manualmente todo el JSX interior — TypeScript/JSX no exige indentación consistente para compilar; solo hay que asegurarse de que las etiquetas de apertura/cierre sigan emparejadas correctamente.)

Reemplazar el cierre del `return` (líneas 234-237 en el estado actual):

```tsx
      </div>
    </div>
  )
}
```

por:

```tsx
      </div>
      <PrivacyNoticeModal isOpen={modalPrivacidadOpen} onClose={() => setModalPrivacidadOpen(false)} />
    </>
  )
}
```

- [ ] **Step 6: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 7: Verificar en vivo sin necesidad de sesión real (regresión estructural)**

Arrancar `npm run dev`, abrir la app con el bypass temporal `{true || isSignedIn}` en `src/App.tsx` (revertirlo exactamente después, confirmando con `git diff src/App.tsx` que vuelve a vacío antes de continuar). Con Playwright:
- Abrir "Nueva Reserva" y confirmar que el formulario sigue mostrando todos sus campos.
- Confirmar que aparece el texto "No incluyas datos de salud..." bajo "Notas".
- Hacer clic en "política de privacidad" y confirmar que se abre el modal con el título "🔒 Política de Privacidad" y el texto completo, incluyendo los marcadores `[NOMBRE DEL NEGOCIO]` y `[EMAIL DE CONTACTO]`.
- Cerrar el modal de privacidad y confirmar que el formulario de reserva sigue debajo, sin haberse cerrado también.

- [ ] **Step 8: Commit**

```bash
git add src/components/PrivacyNoticeModal.tsx src/components/ReserveModal.tsx
git commit -m "feat: add privacy notice modal and link it from the reservation form"
```

---

### Task 2: Borrado real de reservas

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/components/ReservationHistory.tsx`

**Interfaces:**
- Consumes: ninguna interfaz de la Task 1.
- Produces: `deleteReserva(id: string): Promise<void>` en `src/lib/supabase.ts` — borra la fila por completo (no cambia su `estado`).

- [ ] **Step 1: Añadir `deleteReserva` en `src/lib/supabase.ts`**

Localizar el final de la función `updateReserva` (busca el cierre `}` que sigue a `if (error) throw error` dentro de `updateReserva`, justo antes de `export const hayConflictoDisponibilidad`) e insertar esta nueva función entre ambas:

```ts
export const deleteReserva = async (id: string): Promise<void> => {
  const { error } = await supabase.from('reservas').delete().eq('id', id)
  if (error) throw error
}

```

- [ ] **Step 2: Actualizar el import en `src/components/ReservationHistory.tsx`**

Reemplazar la línea 2:

```ts
import { getReservas, updateReservaEstado } from '../lib/supabase'
```

por:

```ts
import { deleteReserva, getReservas, updateReservaEstado } from '../lib/supabase'
```

- [ ] **Step 3: Añadir el manejador de borrado**

Localizar el método `handleEstadoChange` (líneas 37-45 en el estado actual) e insertar este nuevo método justo después de su cierre:

```ts
  const handleEliminarPermanente = async (id: string, clienteNombre: string) => {
    setError(null)
    const confirmado = window.confirm(
      `Esto borrará permanentemente los datos de ${clienteNombre} para esta reserva. Esta acción no se puede deshacer. ¿Continuar?`
    )
    if (!confirmado) return
    try {
      await deleteReserva(id)
      await cargarReservas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la reserva.')
    }
  }
```

- [ ] **Step 4: Añadir el botón en la columna "Acciones"**

Reemplazar (líneas 117-125 en el estado actual):

```tsx
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEstadoChange(reserva.id, 'cancelada')}
                      disabled={reserva.estado === 'cancelada'}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition disabled:opacity-40"
                    >
                      Cancelar Reserva
                    </button>
                  </td>
```

por:

```tsx
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEstadoChange(reserva.id, 'cancelada')}
                      disabled={reserva.estado === 'cancelada'}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition disabled:opacity-40"
                    >
                      Cancelar Reserva
                    </button>
                    <button
                      onClick={() => handleEliminarPermanente(reserva.id, reserva.cliente_nombre)}
                      className="bg-gray-800 text-white px-3 py-1 rounded-lg hover:bg-gray-900 transition ml-2"
                    >
                      Eliminar permanentemente
                    </button>
                  </td>
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Verificar en vivo sin necesidad de sesión real (regresión estructural)**

Con el mismo bypass temporal del Step 7 de la Task 1 (aplicarlo de nuevo si ya se revirtió, y revertirlo otra vez al terminar — confirmar con `git diff src/App.tsx` vacío antes de continuar). Con Playwright: abrir "Historial" y confirmar que cada fila muestra ahora dos botones ("Cancelar Reserva" y "Eliminar permanentemente"). No se puede probar el borrado real aquí porque sin sesión real (RLS) no hay reservas cargadas — eso se verifica en la Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/components/ReservationHistory.tsx
git commit -m "feat: add real reservation deletion for GDPR erasure requests"
```

---

### Task 3: Verificación en vivo con sesión real

**Files:** ninguno (solo verificación).

**Interfaces:**
- Consumes: `PrivacyNoticeModal` (Task 1), `deleteReserva` (Task 2).

**Quién ejecuta esto:** el usuario, con la sesión controladora guiándolo. No delegar a un subagente.

- [ ] **Step 1: Verificar el aviso de privacidad con sesión real**

Con sesión real de Clerk iniciada (sin ningún bypass en el código): abrir "Nueva Reserva", hacer clic en "política de privacidad", confirmar que el modal se abre con el texto completo, y cerrarlo.

- [ ] **Step 2: Verificar el borrado real**

Crear una reserva de prueba desde "Nueva Reserva". Ir a "Historial", localizarla, y hacer clic en "Eliminar permanentemente". Confirmar que aparece el diálogo de confirmación con el aviso de irreversibilidad. Confirmar. Comprobar que la reserva desaparece de la lista del Historial.

- [ ] **Step 3: Confirmar el borrado real en la base de datos**

En el panel de Supabase → **Table Editor** → tabla `reservas`. Confirmar que la fila de la reserva de prueba ya no aparece en absoluto (no que su `estado` cambió a `cancelada`, sino que la fila no existe).

- [ ] **Step 4: Confirmar que "Cancelar Reserva" sigue funcionando igual que antes**

Crear otra reserva de prueba y usar el botón "Cancelar Reserva" (no "Eliminar permanentemente"). Confirmar que su estado cambia a "cancelada" y que la fila sigue apareciendo en el Historial (comportamiento sin cambios).

- [ ] **Step 5: Limpiar los datos de prueba**

Eliminar permanentemente la reserva de prueba creada en el Step 4 (la que se canceló, para no dejarla acumulada).

- [ ] **Step 6: Reportar el resultado al usuario**

Resumen de qué se verificó y el resultado de cada paso — sin necesidad de commit (ningún archivo del repo cambia en esta task). Recordar al usuario que aún debe rellenar `[NOMBRE DEL NEGOCIO]` y `[EMAIL DE CONTACTO]` en `PrivacyNoticeModal.tsx` con sus datos reales antes de considerar el aviso publicable.
