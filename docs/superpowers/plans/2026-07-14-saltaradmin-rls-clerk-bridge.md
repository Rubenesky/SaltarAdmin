# RLS + Puente Clerk↔Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Tasks 3 y 4 requieren al humano en el bucle** (acceso al panel de Supabase y a credenciales reales de Clerk/Google) — no se pueden delegar a un subagente fresco sin capacidad de esperar input interactivo del usuario. La sesión controladora debe ejecutarlas directamente, en conversación con el usuario, no despacharlas como tarea de implementador.

**Goal:** Cerrar el bloqueante #1 de la auditoría de 11 expertos: activar RLS en las 3 tablas de Supabase y conectar Clerk como proveedor de identidad, de forma que solo usuarios con sesión iniciada puedan leer/escribir datos, y las peticiones anónimas queden bloqueadas.

**Architecture:** Third-Party Auth nativo de Supabase (Clerk como proveedor de JWT reconocido por PostgREST) + políticas RLS `to authenticated using (true)` en `articulos`, `reservas`, `bloqueos`. El cliente de Supabase adjunta el token de sesión de Clerk leyendo `window.Clerk.session.getToken()`, sin refactorizar la capa de acceso a datos existente.

**Tech Stack:** `@supabase/supabase-js` 2.110.0, `@clerk/clerk-react` 5.61.8, PostgreSQL RLS, Supabase Storage policies.

## Global Constraints

- Modelo de permisos: un solo nivel — cualquier usuario con sesión de Clerk iniciada tiene acceso completo de lectura/escritura. Sin roles admin/empleado.
- Cero acceso anónimo a datos de negocio (`articulos`, `reservas`, `bloqueos`).
- **Excepción documentada:** la lectura pública del bucket `articulo-imagenes` se mantiene sin autenticar — las etiquetas `<img src>` del navegador no pueden enviar el token de sesión como cabecera, y las fotos de artículos (colchones, hinchables) no son datos sensibles. Solo la política de **subida** (`insert`) al bucket pasa a requerir sesión.
- Fuera de alcance: el bug `err instanceof Error` (~12 sitios, hallazgo separado de Calidad de código), la separación de proyectos Supabase dev/prod (bloqueante #6, se aborda en otra ronda).
- Ningún componente de UI cambia. Esta es una corrección de backend/seguridad pura.

---

### Task 1: Script SQL de políticas RLS + bloqueo de subida anónima

**Files:**
- Create: `docs/supabase-rls-policies.sql`

**Interfaces:**
- Produces: el script SQL que Task 3 ejecutará manualmente en el editor SQL de Supabase. No expone ninguna interfaz de código.

- [ ] **Step 1: Escribir el script SQL completo**

```sql
-- SaltarAdmin: Row Level Security (RLS) + bloqueo de subida anónima de imágenes
--
-- Corrige el bloqueante #1 de la auditoría pre-despliegue (2026-07-14): sin
-- RLS, cualquiera con la clave anónima del proyecto podía leer y escribir
-- toda la base de datos (clientes, reservas, artículos), sin iniciar sesión.
--
-- REQUISITO PREVIO: antes de ejecutar este script, Clerk debe estar
-- registrado como proveedor de Third-Party Auth en este proyecto
-- (Authentication → Third-Party Auth en el panel de Supabase). Si ejecutas
-- este script antes de completar ese paso, ninguna sesión de Clerk podrá
-- leer ni escribir nada -- la app se quedará sin datos hasta que completes
-- el registro del proveedor.
--
-- CÓMO APLICARLA: copia y pega este archivo completo en el editor SQL de
-- Supabase (Dashboard → SQL Editor → New query) y ejecútalo una sola vez.

-- === Tablas: solo usuarios con sesión de Clerk iniciada pueden leer/escribir ===

alter table articulos enable row level security;
create policy "articulos_authenticated_all" on articulos
  for all
  to authenticated
  using (true)
  with check (true);

alter table reservas enable row level security;
create policy "reservas_authenticated_all" on reservas
  for all
  to authenticated
  using (true)
  with check (true);

alter table bloqueos enable row level security;
create policy "bloqueos_authenticated_all" on bloqueos
  for all
  to authenticated
  using (true)
  with check (true);

-- === Storage: la subida de imágenes de artículos deja de ser pública ===
--
-- La lectura pública del bucket 'articulo-imagenes' SE MANTIENE a propósito:
-- las fotos de artículos se muestran con <img src="..."> directamente desde
-- la URL pública, y las etiquetas <img> del navegador no pueden enviar el
-- token de sesión de Clerk como cabecera. Bloquear la lectura rompería la
-- visualización de fotos en toda la app. El riesgo real señalado por la
-- auditoría era la SUBIDA anónima (cualquiera podía llenar el bucket de
-- archivos), no la lectura de fotos de colchones e hinchables, que no son
-- datos sensibles.

drop policy if exists "Subida pública de imágenes de artículos" on storage.objects;

create policy "articulo_imagenes_subida_authenticated"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'articulo-imagenes'
  and (metadata->>'mimetype') in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
);
```

- [ ] **Step 2: Revisar el script a mano (no hay CLI de Supabase configurado en el proyecto)**

Comprobar: los 3 `enable row level security` cubren exactamente las tablas listadas en Global Constraints; el nombre de política `"Subida pública de imágenes de artículos"` coincide carácter por carácter con `docs/supabase-articulo-imagen.sql:19` (para que el `drop policy if exists` la encuentre); la lista de `mimetype` permitidos coincide con la política original.

- [ ] **Step 3: Commit**

```bash
git add docs/supabase-rls-policies.sql
git commit -m "docs: add RLS and storage-upload policies for Clerk auth bridge"
```

---

### Task 2: Conectar el cliente de Supabase al token de sesión de Clerk

**Files:**
- Modify: `src/lib/supabase.ts:1-18`

**Interfaces:**
- Consumes: `window.Clerk.session.getToken()`, expuesto en tiempo de ejecución por `@clerk/clerk-react` una vez `ClerkProvider` (ya montado en `src/main.tsx:11`) termina de cargar.
- Produces: `export const supabase` (sin cambio de tipo ni de firma) — todas las funciones existentes en el resto de `supabase.ts` y sus ~6 puntos de llamada en componentes siguen funcionando sin ningún cambio.

- [ ] **Step 1: Modificar la creación del cliente**

Reemplazar el contenido de `src/lib/supabase.ts` líneas 1-18:

```ts
import { createClient } from '@supabase/supabase-js'
import type {
  Articulo,
  ArticuloEstado,
  Bloqueo,
  Reserva,
  ReservaConArticulo,
  ReservaEstado,
} from '../types'

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>
      }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await window.Clerk?.session?.getToken()) ?? null,
})
```

El resto del archivo (todas las funciones a partir de la línea 20 original) no cambia.

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores. Si `window.Clerk` da un error de tipo duplicado (por si `@clerk/clerk-react` ya declara `Window.Clerk` con otro tipo), esa es la única señal para ajustar el tipo declarado — en ese caso, estrechar la extensión a solo los campos usados en vez de eliminar el `declare global`.

- [ ] **Step 3: Verificar en vivo que no hay regresión (sin necesidad de sesión real todavía)**

En este punto, Clerk **aún no está registrado** como proveedor de Third-Party Auth (eso es Task 3), así que `accessToken` se envía pero Supabase lo ignora — el comportamiento debe ser idéntico al de antes del cambio. Arrancar `npm run dev`, abrir la app en el navegador, y confirmar con Playwright que el Dashboard sigue cargando artículos y reservas exactamente igual que antes (sin sesión iniciada, usando el bypass `{true || isSignedIn}` temporal solo para esta comprobación de regresión visual — revertirlo antes de continuar).

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: attach Clerk session token to the Supabase client"
```

---

### Task 3: Configuración manual — registrar Clerk en Supabase y aplicar las políticas

**Files:** ninguno (acciones en los paneles de Supabase y Clerk, más ejecutar el script de Task 1).

**Interfaces:**
- Consumes: `docs/supabase-rls-policies.sql` (Task 1).
- Produces: el estado del proyecto Supabase con RLS activo — precondición para Task 4.

**Quién ejecuta esto:** el usuario, con la sesión controladora guiándolo paso a paso en el chat. No delegar a un subagente.

- [ ] **Step 1: Obtener la URL de la instancia de Clerk**

En el panel de Clerk (dashboard.clerk.com) → el proyecto de SaltarAdmin → **API Keys**. Ahí aparece el campo "Frontend API URL" (algo como `https://<algo>.clerk.accounts.dev` o un dominio propio si tienen uno configurado). Copiar ese valor completo.

- [ ] **Step 2: Registrar Clerk como proveedor de Third-Party Auth en Supabase**

En el panel de Supabase → el proyecto de SaltarAdmin → **Authentication** → **Third-Party Auth** (a veces bajo "Auth Providers" o "Integrations", el nombre exacto puede variar ligeramente según la versión del panel) → **Add provider** → seleccionar **Clerk** → pegar la Frontend API URL del Step 1 → guardar.

- [ ] **Step 3: Ejecutar el script SQL de Task 1**

En el panel de Supabase → **SQL Editor** → **New query** → pegar el contenido completo de `docs/supabase-rls-policies.sql` → **Run**. Confirmar que no hay errores (si hay un error de "policy already exists" en el `drop policy if exists`, es inofensivo — significa que ya no existía; si hay un error distinto, detenerse y reportarlo antes de continuar).

- [ ] **Step 4: Confirmación verbal del usuario**

El usuario confirma en el chat que completó los Steps 1-3. No hay commit en este task (no se tocó ningún archivo del repo).

---

### Task 4: Verificación en vivo

**Files:** ninguno (solo verificación).

**Interfaces:**
- Consumes: el cliente de Supabase de Task 2, las políticas de Task 3.

- [ ] **Step 1: Confirmar que las peticiones anónimas quedan bloqueadas**

Leer `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de `.env.local` (no imprimirlas en texto plano fuera de esta comprobación) y ejecutar:

```bash
source .env.local
curl -s "$VITE_SUPABASE_URL/rest/v1/reservas?select=id" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

Expected: `[]` (array vacío — RLS bloquea todas las filas para el rol `anon`), no un listado de reservas reales.

- [ ] **Step 2: El usuario inicia sesión real**

El usuario abre la app en el navegador (`npm run dev`, sin ningún bypass en el código) e inicia sesión con sus credenciales reales de Google a través de Clerk.

- [ ] **Step 3: Verificar los 3 flujos de escritura principales con Playwright, con la sesión real ya iniciada**

Crear una reserva de prueba (arrastrando una celda del calendario), editar un artículo existente, crear un bloqueo de mantenimiento de prueba. Confirmar en cada caso que la operación se completa sin error visible y que el dato nuevo aparece reflejado en la interfaz tras recargar.

- [ ] **Step 4: Verificar la subida de imagen con sesión real**

Subir una imagen de prueba a un artículo desde `ManageArticleModal`. Confirmar que se sube correctamente y la miniatura se muestra.

- [ ] **Step 5: Limpiar los datos de prueba**

Cancelar/eliminar la reserva y el bloqueo de prueba creados en el Step 3, y quitar la imagen de prueba subida en el Step 4, para no dejar basura en la base de datos real (es el único proyecto Supabase existente — no hay entorno de pruebas separado, ver bloqueante #6 fuera de alcance).

- [ ] **Step 6: Reportar el resultado al usuario**

Resumen de qué se verificó y el resultado de cada paso — sin necesidad de commit (ningún archivo cambia en este task).
