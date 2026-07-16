# Correcciones restantes de la auditoría Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Este plan parte de `master` limpio** (incluye ya el rediseño Swiss/Minimalista fusionado).

**Goal:** Cerrar los hallazgos "Alto"/"Medio" restantes de la auditoría de 11 expertos (excluyendo la licencia de FullCalendar, ya rechazada, y Sentry, omitido esta ronda): bugs de código y accesibilidad, rendimiento rápido, y arranque de ESLint + tests.

**Architecture:** Cambios independientes por dominio (seguridad/docs, manejo de errores, accesibilidad de modales, rendimiento, herramientas) sobre la base de código ya existente. Ningún cambio de esquema de base de datos real ni de features de producto.

**Tech Stack:** React + TypeScript, Tailwind CSS, Vite, `react-modal` (ya instalado), ESLint 9 (flat config), Vitest.

## Global Constraints

- No se tocan features de producto (precio, multi-unidad, panel "Hoy", etc.) — fuera de alcance explícito.
- No se ejecuta ningún script SQL contra la base de datos real en esta ronda.
- Los estilos visuales de los 6 modales (clases Tailwind ya aplicadas en el rediseño Swiss/Minimalista) se preservan exactamente al migrar a `react-modal` — solo cambia el elemento contenedor, no el aspecto.
- `getErrorMessage` no debe cambiar ningún texto de mensaje de fallback ya escrito a mano en el código — solo arregla la extracción del mensaje real de Supabase cuando exista.
- ESLint y Vitest son un arranque razonable (reglas recomendadas de los plugins, 8 casos de test para `intervalosSolapan`), no una cobertura exhaustiva.

---

### Task 1: Seguridad, documentación de entorno y README (independiente — archivos nuevos, sin dependencias de otras tasks)

**Files:**
- Create: `vercel.json`
- Modify: `.env.example`
- Create: `README.md`

**Interfaces:**
- Produces: ninguna interfaz de código — documentación y configuración de despliegue.

- [ ] **Step 1: Crear `vercel.json` con cabeceras de seguridad**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev; frame-src https://*.clerk.accounts.dev;"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Corregir `.env.example`**

Reemplazar el contenido completo:

```
VITE_API_URL=http://localhost:3000/api
```

por:

```
# Clave pública de Clerk (dashboard.clerk.com > API Keys > Publishable key)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# URL del proyecto Supabase (Project Settings > API > Project URL)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Clave anónima/publicable de Supabase (Project Settings > API > anon public key)
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

- [ ] **Step 3: Crear `README.md`**

```markdown
# SaltarAdmin

Aplicación de gestión de reservas e inventario para un negocio de alquiler de colchones hinchables y equipamiento de fiestas ("Saltarines"). Calendario de disponibilidad, reservas, bloqueos de mantenimiento, e historial — pensada para uso interno del equipo desde móvil y escritorio.

## Instalación

```bash
npm install
cp .env.example .env.local
```

Rellena `.env.local` con tus credenciales reales de Clerk y Supabase (ver comentarios en `.env.example` para dónde encontrarlas).

```bash
npm run dev
```

## Scripts disponibles

- `npm run dev` — servidor de desarrollo (Vite)
- `npm run build` — build de producción (`tsc -b && vite build`)
- `npm run preview` — sirve el build de producción localmente
- `npm run lint` — ESLint sobre todo el proyecto
- `npm run test` — tests unitarios (Vitest)

## Stack

React + TypeScript + Vite, Tailwind CSS, Clerk (autenticación), Supabase (base de datos Postgres + Storage), FullCalendar (calendario de recursos y vista mensual).

## Documentación de diseño

Cada funcionalidad significativa tiene su spec y su plan de implementación en `docs/superpowers/`:

- [`docs/superpowers/specs/`](docs/superpowers/specs/) — decisiones de diseño y por qué se tomaron.
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — planes de implementación tarea por tarea.

Estos documentos existen para que cualquiera que retome el proyecto entienda el razonamiento detrás del código, no solo el resultado final.
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example README.md
git commit -m "docs: add security headers, fix .env.example, add README"
```

---

### Task 2: Manejo de errores — helper `getErrorMessage` + `ErrorBoundary` (independiente de accesibilidad; toca los mismos archivos que Task 5, así que se ejecuta antes)

**Files:**
- Create: `src/lib/errors.ts`
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/main.tsx`
- Modify: `src/lib/ClerkSupabaseBridge.tsx` (si tiene algún catch — verificar; si no tiene, omitir)
- Modify: `src/components/ReserveModal.tsx`
- Modify: `src/components/ManageArticleModal.tsx`
- Modify: `src/components/GestionarReservasModal.tsx`
- Modify: `src/components/ArticleDetailModal.tsx`
- Modify: `src/components/ReservationHistory.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `getErrorMessage(err: unknown, fallback: string): string` desde `src/lib/errors.ts`, usado por todas las tasks futuras que añadan manejo de errores.
- Produces: `ErrorBoundary` (componente React) desde `src/components/ErrorBoundary.tsx`.

- [ ] **Step 1: Crear `src/lib/errors.ts`**

```typescript
export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message
  }
  return fallback
}
```

- [ ] **Step 2: Crear `src/components/ErrorBoundary.tsx`**

```tsx
import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Error no controlado:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
          <div className="bg-white border-2 border-gray-900 p-6 max-w-md text-center">
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Algo ha ido mal</h1>
            <p className="text-gray-600 mb-4">
              Ha ocurrido un error inesperado. Recarga la página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-4 py-2 hover:bg-primary/90 transition"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
```

- [ ] **Step 3: Montar `ErrorBoundary` y validar la clave de Clerk en `src/main.tsx`**

Reemplazar el contenido completo:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App'
import ClerkSupabaseBridge from './lib/ClerkSupabaseBridge'
import ErrorBoundary from './components/ErrorBoundary'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (!clerkPubKey) {
  root.render(
    <React.StrictMode>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white border-2 border-gray-900 p-6 max-w-md text-center">
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Falta configuración</h1>
          <p className="text-gray-600">
            No se encontró <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Revisa tu archivo <code>.env.local</code>.
          </p>
        </div>
      </div>
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <ClerkSupabaseBridge />
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}
```

- [ ] **Step 4: Aplicar `getErrorMessage` en `src/components/ReserveModal.tsx`**

Reemplazar:

```tsx
        .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.'))
```

por:

```tsx
        .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los artículos.')))
```

Reemplazar:

```tsx
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23P01') {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear la reserva.')
      }
    } finally {
```

por:

```tsx
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23P01') {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
      } else {
        setError(getErrorMessage(err, 'No se pudo crear la reserva.'))
      }
    } finally {
```

Añadir el import (junto a los imports existentes al inicio del archivo):

```tsx
import { getErrorMessage } from '../lib/errors'
```

- [ ] **Step 5: Aplicar `getErrorMessage` en `src/components/ManageArticleModal.tsx`**

Añadir el import:

```tsx
import { getErrorMessage } from '../lib/errors'
```

Reemplazar cada una de las 4 ocurrencias del patrón `err instanceof Error ? err.message : '<mensaje>'` por `getErrorMessage(err, '<mismo mensaje>')`, manteniendo el mensaje de fallback existente en cada sitio exactamente igual:

```tsx
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudieron cargar los artículos.'))
```

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo crear el artículo.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo crear el artículo.'))
```

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo actualizar el estado.'))
```

En `handleEliminarArticulo`, dentro del bloque `else`:
```tsx
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el artículo.')
      }
```
→
```tsx
      } else {
        setError(getErrorMessage(err, 'No se pudo eliminar el artículo.'))
      }
```

- [ ] **Step 6: Aplicar `getErrorMessage` en `src/components/GestionarReservasModal.tsx`**

Añadir el import:

```tsx
import { getErrorMessage } from '../lib/errors'
```

Reemplazar las 3 ocurrencias:

```tsx
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudieron cargar las reservas.'))
```

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reserva.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo guardar la reserva.'))
```

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo cancelar la reserva.'))
```

- [ ] **Step 7: Aplicar `getErrorMessage` en `src/components/ArticleDetailModal.tsx`**

Añadir el import:

```tsx
import { getErrorMessage } from '../lib/errors'
```

Reemplazar:

```tsx
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del artículo.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudieron cargar los datos del artículo.'))
```

Dentro de `handleCrearBloqueo`, en el bloque `else`:
```tsx
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear el bloqueo.')
      }
```
→
```tsx
      } else {
        setError(getErrorMessage(err, 'No se pudo crear el bloqueo.'))
      }
```

Reemplazar:

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el bloqueo.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo eliminar el bloqueo.'))
```

- [ ] **Step 8: Aplicar `getErrorMessage` en `src/components/ReservationHistory.tsx`**

Añadir el import:

```tsx
import { getErrorMessage } from '../lib/errors'
```

Reemplazar las 3 ocurrencias:

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo cargar el historial.'))
```

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la reserva.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo actualizar la reserva.'))
```

```tsx
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la reserva.')
```
→
```tsx
      setError(getErrorMessage(err, 'No se pudo eliminar la reserva.'))
```

- [ ] **Step 9: Aplicar `getErrorMessage` en `src/App.tsx`**

Añadir el import:

```tsx
import { getErrorMessage } from './lib/errors'
```

Reemplazar:

```tsx
      const message = err instanceof Error ? err.message : 'Error al cargar los detalles del artículo'
      setError(message)
```
por:

```tsx
      const message = getErrorMessage(err, 'Error al cargar los detalles del artículo')
      setError(message)
```

- [ ] **Step 10: Verificar `src/lib/ClerkSupabaseBridge.tsx`**

Leer el archivo; si contiene algún `catch` con el mismo patrón, aplicar el mismo reemplazo con `getErrorMessage`. Si no tiene ningún `catch`, no modificar este archivo.

- [ ] **Step 11: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 12: Verificar en vivo (regresión estructural, con bypass temporal)**

Provocar un error real (p. ej. intentar crear una reserva solapada) y confirmar en la UI que aparece el mensaje específico ya existente ("Ese artículo no está disponible..."), no un mensaje genérico ni un error crudo.

- [ ] **Step 13: Commit**

```bash
git add src/lib/errors.ts src/components/ErrorBoundary.tsx src/main.tsx src/components/ReserveModal.tsx src/components/ManageArticleModal.tsx src/components/GestionarReservasModal.tsx src/components/ArticleDetailModal.tsx src/components/ReservationHistory.tsx src/App.tsx
git commit -m "fix: add ErrorBoundary and getErrorMessage helper so Supabase errors reach the user"
```

(Si el Step 10 modificó `ClerkSupabaseBridge.tsx`, añadirlo también al `git add`.)

---

### Task 3: Accesibilidad de teclado — migrar los 6 modales a `react-modal` (depende de Task 2 estar commiteada, ya que toca los mismos archivos; NO paralelizable con Task 2)

**Files:**
- Modify: `src/components/ReserveModal.tsx`
- Modify: `src/components/PrivacyNoticeModal.tsx`
- Modify: `src/components/ManageArticleModal.tsx`
- Modify: `src/components/GestionarReservasModal.tsx`
- Modify: `src/components/ArticleDetailModal.tsx`
- Modify: `src/components/DayReservationsModal.tsx`

**Interfaces:**
- Consumes: `react-modal` (`Modal` default export), ya instalado en `package.json` con sus tipos (`@types/react-modal`).

- [ ] **Step 1: Migrar `PrivacyNoticeModal.tsx` (el más simple, empezar por aquí como referencia de patrón)**

Añadir el import al inicio del archivo:

```tsx
import Modal from 'react-modal'
```

Reemplazar:

```tsx
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto outline-none"
    >
```

Y reemplazar el cierre correspondiente al final del componente:

```tsx
      </div>
    </div>
  )
}
```

por:

```tsx
    </Modal>
  )
}
```

Eliminar la línea `if (!isOpen) return null` — `react-modal` ya gestiona internamente si renderiza o no según `isOpen`, y necesita quedar siempre montado para poder animar/gestionar el foco correctamente. Verificar que no queda ninguna referencia rota tras eliminarla (el resto del componente no depende de ese early-return para nada más).

- [ ] **Step 2: Migrar `DayReservationsModal.tsx` con el mismo patrón**

Añadir el import:

```tsx
import Modal from 'react-modal'
```

Reemplazar:

```tsx
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto outline-none"
    >
```

Reemplazar el cierre:

```tsx
      </div>
    </div>
  )
}
```

por:

```tsx
    </Modal>
  )
}
```

Eliminar `if (!isOpen) return null`.

- [ ] **Step 3: Migrar `ManageArticleModal.tsx`**

Añadir el import:

```tsx
import Modal from 'react-modal'
```

Reemplazar:

```tsx
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleBackdropClick}
      ariaHideApp={false}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto outline-none"
    >
```

Reemplazar el cierre:

```tsx
      </div>
    </div>
  )
}
```

por:

```tsx
    </Modal>
  )
}
```

Eliminar `if (!isOpen) return null`. Nota: `handleBackdropClick` ya contiene su propia lógica de confirmación ("¿Descartar los cambios?") — `onRequestClose` de `react-modal` se dispara tanto al pulsar Escape como al clicar fuera del `className` (el overlay), así que reutilizar `handleBackdropClick` tal cual preserva ese comportamiento para ambos casos.

- [ ] **Step 4: Migrar `GestionarReservasModal.tsx`**

Añadir el import:

```tsx
import Modal from 'react-modal'
```

Reemplazar:

```tsx
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleBackdropClick}
      ariaHideApp={false}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-2xl w-full max-h-[85vh] overflow-y-auto outline-none"
    >
```

Reemplazar el cierre:

```tsx
      </div>
    </div>
  )
}
```

por:

```tsx
    </Modal>
  )
}
```

Eliminar `if (!isOpen) return null`.

- [ ] **Step 5: Migrar `ArticleDetailModal.tsx`**

Añadir el import:

```tsx
import Modal from 'react-modal'
```

Reemplazar:

```tsx
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
    <Modal
      isOpen={isOpen}
      onRequestClose={handleBackdropClick}
      ariaHideApp={false}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto outline-none"
    >
```

Reemplazar el cierre:

```tsx
      </div>
    </div>
  )
}
```

por:

```tsx
    </Modal>
  )
}
```

Eliminar `if (!isOpen) return null`.

- [ ] **Step 6: Migrar `ReserveModal.tsx`**

Este archivo es distinto: envuelve el modal en un `<>...</>` porque también renderiza `<PrivacyNoticeModal>` como hermano. Añadir el import:

```tsx
import Modal from 'react-modal'
```

Reemplazar:

```tsx
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
```

por:

```tsx
  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={handleBackdropClick}
        ariaHideApp={false}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto outline-none"
      >
```

Reemplazar el cierre (justo antes de `<PrivacyNoticeModal .../>`):

```tsx
      </div>
    </div>
    <PrivacyNoticeModal isOpen={modalPrivacidadOpen} onClose={() => setModalPrivacidadOpen(false)} />
    </>
  )
}
```

por:

```tsx
      </Modal>
    <PrivacyNoticeModal isOpen={modalPrivacidadOpen} onClose={() => setModalPrivacidadOpen(false)} />
    </>
  )
}
```

Eliminar `if (!isOpen) return null`.

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 8: Verificar en vivo (con bypass temporal)**

Abrir cada uno de los 6 modales y confirmar: aspecto visual idéntico al de antes de este task, Tab no se escapa del modal, Escape lo cierra, y el foco vuelve al botón que lo abrió al cerrarlo. Confirmar que no aparece ningún warning de `react-modal` sobre `appElement` en la consola del navegador.

- [ ] **Step 9: Commit**

```bash
git add src/components/ReserveModal.tsx src/components/PrivacyNoticeModal.tsx src/components/ManageArticleModal.tsx src/components/GestionarReservasModal.tsx src/components/ArticleDetailModal.tsx src/components/DayReservationsModal.tsx
git commit -m "fix: use react-modal for keyboard focus trapping in all 6 modals"
```

---

### Task 4: Etiquetas accesibles + artículo navegable por teclado en el calendario (independiente — no toca los mismos archivos que Task 2/3)

**Files:**
- Modify: `src/components/GestionarReservasModal.tsx`
- Modify: `src/components/ReservationHistory.tsx`
- Modify: `src/components/Calendar.tsx`

**Interfaces:**
- Ninguna nueva — solo atributos ARIA/DOM sobre elementos existentes.

- [ ] **Step 1: `GestionarReservasModal.tsx` — buscador**

Reemplazar:

```tsx
            placeholder="Buscar por nombre o teléfono..."
            className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

por:

```tsx
            placeholder="Buscar por nombre o teléfono..."
            aria-label="Buscar por nombre o teléfono"
            className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

- [ ] **Step 2: `ReservationHistory.tsx` — buscador**

Reemplazar:

```tsx
          placeholder="Buscar por nombre o teléfono..."
          className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

por:

```tsx
          placeholder="Buscar por nombre o teléfono..."
          aria-label="Buscar por nombre o teléfono"
          className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
```

- [ ] **Step 3: `ReservationHistory.tsx` — select de estado**

Reemplazar:

```tsx
                    <select
                      value={reserva.estado}
                      onChange={(e) => handleEstadoChange(reserva.id, e.target.value as ReservaEstado)}
                      className={`px-2 py-1 rounded-none ${ESTADO_STYLES[reserva.estado]}`}
                    >
```

por:

```tsx
                    <select
                      value={reserva.estado}
                      onChange={(e) => handleEstadoChange(reserva.id, e.target.value as ReservaEstado)}
                      aria-label={`Cambiar estado de la reserva de ${reserva.cliente_nombre}`}
                      className={`px-2 py-1 rounded-none ${ESTADO_STYLES[reserva.estado]}`}
                    >
```

- [ ] **Step 4: `Calendar.tsx` — nombre de artículo accesible por teclado**

Reemplazar:

```tsx
        resourceLabelDidMount={(info) => {
          info.el.style.cursor = 'pointer'
          info.el.addEventListener('click', () => onArticuloClickRef.current(info.resource.id))
        }}
```

por:

```tsx
        resourceLabelDidMount={(info) => {
          info.el.style.cursor = 'pointer'
          info.el.setAttribute('role', 'button')
          info.el.setAttribute('tabindex', '0')
          info.el.addEventListener('click', () => onArticuloClickRef.current(info.resource.id))
          info.el.addEventListener('keydown', (e) => {
            const event = e as KeyboardEvent
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onArticuloClickRef.current(info.resource.id)
            }
          })
        }}
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Verificar en vivo (con bypass temporal)**

Con un lector de pantalla o solo inspeccionando el DOM: confirmar que el buscador y el select de estado exponen su `aria-label`. En el calendario, navegar con Tab hasta el nombre de un artículo y confirmar que Enter/Espacio abre su detalle igual que un clic.

- [ ] **Step 7: Commit**

```bash
git add src/components/GestionarReservasModal.tsx src/components/ReservationHistory.tsx src/components/Calendar.tsx
git commit -m "fix: add accessible labels to search/select fields and keyboard access to calendar resource labels"
```

---

### Task 5: Rendimiento — `React.lazy` para las vistas de calendario (independiente, puede ejecutarse en paralelo con Task 1/4/6)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Ninguna nueva.

- [ ] **Step 1: Sustituir los imports estáticos por `React.lazy`**

Reemplazar:

```tsx
import Calendar from './components/Calendar'
import MonthCalendarView from './components/MonthCalendarView'
```

por:

```tsx
const Calendar = React.lazy(() => import('./components/Calendar'))
const MonthCalendarView = React.lazy(() => import('./components/MonthCalendarView'))
```

(Estas líneas se mueven de la zona de imports a justo después de los imports restantes, ya que `React.lazy` no es un import estático — deben quedar como declaraciones de módulo al mismo nivel que antes, simplemente ya no usan la palabra clave `import` de ES modules sino la función `React.lazy`.)

- [ ] **Step 2: Envolver el `<main>` en `<Suspense>`**

Reemplazar:

```tsx
      <main className="p-6">
        {error && (
```

por:

```tsx
      <main className="p-6">
        <React.Suspense fallback={<p className="text-gray-500 text-sm">Cargando...</p>}>
        {error && (
```

Y localizar el cierre de `</main>` para añadir el cierre de `</React.Suspense>` justo antes:

```tsx
      </main>
```

por:

```tsx
        </React.Suspense>
      </main>
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Verificar en vivo (con bypass temporal)**

Navegar entre Dashboard, Calendario e Historial y confirmar que no hay ninguna regresión visual ni funcional — el "Cargando..." puede aparecer brevemente la primera vez que se visita cada vista de calendario.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "perf: code-split calendar views with React.lazy"
```

---

### Task 6: Rendimiento — redimensionar imágenes antes de subir (independiente, puede ejecutarse en paralelo con Task 1/4/5)

**Files:**
- Create: `src/lib/images.ts`
- Modify: `src/components/ManageArticleModal.tsx`

**Interfaces:**
- Produces: `resizeImage(file: File, maxDimension: number): Promise<File>` desde `src/lib/images.ts`.

- [ ] **Step 1: Crear `src/lib/images.ts`**

```typescript
export const resizeImage = (file: File, maxDimension: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const { width, height } = img
      const largestSide = Math.max(width, height)

      if (largestSide <= maxDimension) {
        resolve(file)
        return
      }

      const scale = maxDimension / largestSide
      const targetWidth = Math.round(width * scale)
      const targetHeight = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], file.name, { type: file.type }))
        },
        file.type,
        0.85
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo procesar la imagen.'))
    }

    img.src = objectUrl
  })
}
```

- [ ] **Step 2: Usar `resizeImage` en `ManageArticleModal.tsx` antes de subir**

Añadir el import:

```tsx
import { resizeImage } from '../lib/images'
```

Reemplazar:

```tsx
    try {
      const imagenUrl = imagenArchivo ? await uploadArticuloImagen(imagenArchivo) : null
```

por:

```tsx
    try {
      const imagenRedimensionada = imagenArchivo ? await resizeImage(imagenArchivo, 1200) : null
      const imagenUrl = imagenRedimensionada ? await uploadArticuloImagen(imagenRedimensionada) : null
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Verificar en vivo (con bypass temporal)**

Subir una imagen grande (varios MB, más de 1200px de lado mayor) al crear un artículo nuevo y confirmar en las herramientas de red del navegador que el archivo subido a Supabase Storage es más pequeño que el original, y que la imagen se sigue viendo correctamente en el detalle del artículo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.ts src/components/ManageArticleModal.tsx
git commit -m "perf: resize uploaded images client-side before storing"
```

---

### Task 7: ESLint (independiente, puede ejecutarse en paralelo con Task 1/4/5/6; NO en paralelo con Task 2/3 porque corregir hallazgos de lint puede tocar los mismos archivos que esas tasks — ejecutar después de que Task 2 y Task 3 estén commiteadas)

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json`
- Modify: los archivos donde ESLint encuentre errores reales (no solo advertencias de estilo) — determinar en el Step 4.

**Interfaces:**
- Produces: script `npm run lint`.

- [ ] **Step 1: Instalar las dependencias de ESLint**

```bash
npm install --save-dev eslint@^9 typescript-eslint@^8 eslint-plugin-react-hooks@^5 eslint-plugin-jsx-a11y@^6 globals@^15
```

- [ ] **Step 2: Crear `eslint.config.js`**

```javascript
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  }
)
```

- [ ] **Step 3: Añadir los scripts `lint` y `test` a `package.json`**

Reemplazar:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
```

por:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Ejecutar ESLint y corregir los hallazgos reales**

Run: `npm run lint`

Revisar la salida. Corregir los errores (no advertencias de estilo puro) que ESLint señale — típicamente: dependencias de `useEffect` faltantes detectadas por `react-hooks/exhaustive-deps`, o `alt` faltante en alguna imagen detectado por `jsx-a11y`. Si aparecen más de ~15 hallazgos no triviales, corregir los de mayor severidad y documentar el resto en el mensaje de commit, sin bloquear el resto del plan por esto.

- [ ] **Step 5: Verificar que el build sigue pasando tras las correcciones**

Run: `npx tsc -b && npm run lint`
Expected: `tsc -b` sin errores; `eslint .` sin errores (advertencias aceptables si quedaron documentadas).

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: add ESLint with typescript-eslint, react-hooks, and jsx-a11y"
```

(Si el Step 4 corrigió archivos adicionales, añadirlos también al `git add` de este commit o hacer un commit separado `fix: address ESLint findings` inmediatamente después — a discreción de quien ejecute, ambas opciones son aceptables.)

---

### Task 8: Vitest — función pura de solapamiento + tests (depende de que Task 7 haya añadido ya la línea `"test"` a `package.json` — si Task 7 aún no se ha ejecutado, esta task añade esa línea ella misma; coordinar el orden para evitar un conflicto de merge en `package.json`)

**Files:**
- Create: `src/lib/disponibilidad.ts`
- Create: `src/lib/disponibilidad.test.ts`
- Create: `vitest.config.ts`
- Modify: `src/lib/supabase.ts`
- Modify: `package.json` (solo si Task 7 no añadió ya el script `test`)

**Interfaces:**
- Produces: `intervalosSolapan(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean` desde `src/lib/disponibilidad.ts`.

- [ ] **Step 1: Instalar Vitest**

```bash
npm install --save-dev vitest@^2
```

- [ ] **Step 2: Crear `src/lib/disponibilidad.ts`**

```typescript
/**
 * Determina si dos intervalos de fecha semiabiertos [inicio, fin) se solapan.
 * Esta es la especificación de referencia para la comprobación de disponibilidad
 * que hayConflictoDisponibilidad (en supabase.ts) implementa vía query SQL
 * (.lt('fecha_inicio', fin).gt('fecha_fin', inicio)) — misma semántica exacta,
 * documentada y testeada aquí de forma aislada del query builder.
 */
export const intervalosSolapan = (
  aInicio: string,
  aFin: string,
  bInicio: string,
  bFin: string
): boolean => {
  return aInicio < bFin && aFin > bInicio
}
```

- [ ] **Step 3: Crear `src/lib/disponibilidad.test.ts`**

```typescript
import { describe, expect, it } from 'vitest'
import { intervalosSolapan } from './disponibilidad'

describe('intervalosSolapan', () => {
  it('detecta solapamiento total (mismo rango exacto)', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-10', '2026-01-15')).toBe(true)
  })

  it('detecta solapamiento parcial por la izquierda', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-05', '2026-01-12')).toBe(true)
  })

  it('detecta solapamiento parcial por la derecha', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-12', '2026-01-20')).toBe(true)
  })

  it('detecta cuando un intervalo contiene por completo al otro', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-20', '2026-01-12', '2026-01-15')).toBe(true)
  })

  it('NO detecta solapamiento en intervalos adyacentes (fin de A === inicio de B)', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-15', '2026-01-20')).toBe(false)
  })

  it('NO detecta solapamiento en intervalos completamente separados', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-02-01', '2026-02-05')).toBe(false)
  })

  it('NO detecta solapamiento cuando B es un instante dentro de A (intervalo vacío)', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-20', '2026-01-14', '2026-01-14')).toBe(false)
  })

  it('detecta turno de recogida-y-entrega el mismo día como NO solapado consigo mismo (intervalo vacío)', () => {
    // Un intervalo con inicio === fin es vacío bajo la convención [inicio, fin) —
    // no debe considerarse solapado con nada, ni siquiera con un rango que lo envuelve.
    expect(intervalosSolapan('2026-01-15', '2026-01-15', '2026-01-10', '2026-01-20')).toBe(false)
  })
})
```

- [ ] **Step 4: Crear `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Añadir un comentario de referencia en `src/lib/supabase.ts`**

Localizar la función `hayConflictoDisponibilidad` y añadir justo encima de su declaración (sin cambiar ninguna línea de su cuerpo):

```typescript
// La semántica de solapamiento de intervalos [inicio, fin) que implementan
// las llamadas .lt()/.gt() de abajo está documentada y testeada de forma
// aislada en src/lib/disponibilidad.ts (intervalosSolapan).
```

- [ ] **Step 6: Añadir el script `test` a `package.json` (solo si Task 7 no lo añadió ya)**

Verificar si `"test": "vitest run"` ya existe en `scripts`. Si no existe, añadirlo junto a los demás scripts.

- [ ] **Step 7: Ejecutar los tests**

Run: `npm run test`
Expected: 8/8 tests en verde.

- [ ] **Step 8: Verificar que el build sigue pasando**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/lib/disponibilidad.ts src/lib/disponibilidad.test.ts vitest.config.ts src/lib/supabase.ts package.json package-lock.json
git commit -m "test: add Vitest and pure intervalosSolapan function with 8 edge-case tests"
```

---

### Task 9: Documentación de esquema de base de datos (independiente, puede ejecutarse en paralelo con cualquier otra task — no toca ningún archivo de código)

**Files:**
- Create: `docs/supabase-schema.sql`

**Interfaces:**
- Ninguna — documentación de referencia, no se ejecuta contra la base de datos real en esta ronda.

- [ ] **Step 1: Crear `docs/supabase-schema.sql`**

```sql
-- Reconstrucción de referencia del esquema de SaltarAdmin, escrita porque
-- no existía ningún script de creación de esquema versionado en el repo
-- (auditoría 2026-07-14, hallazgo de Mantenibilidad/Base de datos).
--
-- Este archivo documenta el esquema tal como se asume que existe en
-- producción a día de hoy. NO se ha ejecutado contra la base de datos real
-- como parte de este cambio — antes de aplicarlo, confirma manualmente que
-- coincide con tu esquema real (por ejemplo, con `\d+ articulos` en el SQL
-- editor de Supabase) y ajusta lo que difiera.

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

create table if not exists articulos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  categoria text not null,
  estado text not null check (estado in ('disponible', 'mantenimiento', 'baja')),
  imagen_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reservas (
  id uuid primary key default uuid_generate_v4(),
  -- ON DELETE RESTRICT: el código (ManageArticleModal.tsx, handleEliminarArticulo)
  -- asume que borrar un artículo con reservas asociadas falla con el código de
  -- error 23503 en vez de borrar esas reservas en cascada. Si tu FK real es
  -- CASCADE, corrígelo aquí y revisa ese manejador de error.
  articulo_id uuid not null references articulos(id) on delete restrict,
  cliente_nombre text not null,
  cliente_telefono text not null,
  cliente_email text,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bloqueos (
  id uuid primary key default uuid_generate_v4(),
  articulo_id uuid not null references articulos(id) on delete restrict,
  fecha_inicio date not null,
  fecha_fin date not null,
  motivo text,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Commit**

```bash
git add docs/supabase-schema.sql
git commit -m "docs: add reference schema documenting the assumed FK ON DELETE behavior"
```

---

### Task 10: Verificación final en vivo con sesión real (requiere al usuario)

**Files:** ninguno.

- [ ] **Step 1: Recorrido completo con sesión real**

Con sesión real de Clerk: recorrer los 6 modales confirmando que Tab/Escape/foco funcionan como se espera y que el aspecto visual no cambió. Provocar un error real (reserva solapada) y confirmar el mensaje específico. Navegar el calendario con teclado hasta un artículo y abrir su detalle con Enter.

- [ ] **Step 2: Confirmar que ningún flujo funcional se rompió**

Crear, editar, cancelar y eliminar permanentemente una reserva de prueba; subir una imagen grande a un artículo nuevo y confirmar que se ve bien.

- [ ] **Step 3: Limpiar datos de prueba**

Eliminar permanentemente la reserva y el artículo de prueba creados en el Step 2.

- [ ] **Step 4: Reportar el resultado al usuario**

Resumen de qué se verificó — sin necesidad de commit (ningún archivo cambia en esta task).
