# SaltarAdmin

Aplicación web de gestión de reservas e inventario para un negocio de alquiler de artículos de fiesta (colchones hinchables, colchones acuáticos y servicios asociados — "Saltarines"). Pensada para uso interno del equipo, desde móvil y escritorio: un dashboard con el calendario de disponibilidad de cada artículo, gestión de reservas y bloqueos de mantenimiento, e historial de clientes.

## Qué hace

- **Dashboard (calendario de recursos)** — una fila por artículo, agrupadas por categoría, con las reservas y bloqueos pintados sobre una línea de tiempo diaria (`@fullcalendar/resource-timeline`). Clic en una celda libre abre el formulario de reserva con el artículo y las fechas ya rellenos; clic en el nombre de un artículo abre su detalle.
- **Vista mensual** — calendario de mes tradicional con los días que tienen alguna reserva activa resaltados; clic en un día abre el listado de reservas de esa fecha.
- **Crear reserva** — desde una celda del dashboard (contexto fijo) o en blanco desde el botón "Nueva Reserva" (elige artículo y fechas a mano). Antes de guardar comprueba disponibilidad contra reservas y bloqueos existentes del artículo.
- **Gestionar reservas** — buscador por nombre o teléfono, edición inline de los datos del cliente/fechas/notas/estado, y cancelación. Vuelve a comprobar disponibilidad al editar fechas (excluyendo la propia reserva).
- **Historial de reservas** — listado completo (incluidas canceladas), con cambio de estado (`pendiente` → `confirmada` → `completada`/`cancelada`) y borrado permanente de los datos de un cliente concreto (para peticiones de derecho al olvido).
- **Detalle de artículo** — imagen, historial de reservas de ese artículo, y gestión de bloqueos de mantenimiento (periodos en los que el artículo no está disponible aunque no haya reserva).
- **Gestionar artículos** — alta de artículos (nombre, categoría, estado, imagen), cambio de estado (`disponible` / `mantenimiento` / `baja`), y borrado (bloqueado si el artículo tiene reservas o bloqueos asociados, para no perder historial). Las imágenes se redimensionan en el navegador antes de subirlas.
- **Aviso de privacidad** integrado en el formulario de reserva, con qué datos se guardan, base legal, plazo de conservación y cómo pedir el borrado.
- **Autenticación** con Clerk — toda la app (salvo el botón de login) está detrás de sesión iniciada.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 18 + TypeScript, Vite |
| Estilos | Tailwind CSS |
| Calendario | FullCalendar (`resource-timeline`, `daygrid`, `interaction`, `timegrid`) |
| Autenticación | Clerk (`@clerk/clerk-react`) |
| Backend / datos | Supabase (Postgres + Storage), vía `@supabase/supabase-js` con RLS y el token de Clerk como JWT de autenticación |
| Modales / iconos | `react-modal`, `lucide-react` |
| Tests | Vitest |
| Lint | ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`) |
| Despliegue | Cloudflare Pages (`public/_headers` con cabeceras de seguridad / CSP) |

## Estructura del proyecto

```
src/
  App.tsx                      # Navegación entre vistas, estado de modales
  components/
    Calendar.tsx                # Dashboard: calendario de recursos agrupado por categoría
    MonthCalendarView.tsx       # Vista mensual
    DayReservationsModal.tsx    # Reservas de un día concreto (vista mensual)
    ReserveModal.tsx            # Crear reserva
    GestionarReservasModal.tsx  # Buscar / editar / cancelar reservas
    ReservationHistory.tsx      # Historial completo + borrado permanente
    ArticleDetailModal.tsx      # Detalle de artículo: historial + bloqueos
    ManageArticleModal.tsx      # Alta / estado / borrado de artículos
    PrivacyNoticeModal.tsx      # Aviso de privacidad
    ErrorBoundary.tsx
  lib/
    supabase.ts                 # Cliente Supabase + todas las queries (CRUD, disponibilidad)
    disponibilidad.ts           # Lógica pura de solapamiento de intervalos de fecha
    ClerkSupabaseBridge.tsx     # Inyecta el token de sesión de Clerk en el cliente Supabase
    categorias.ts               # Catálogo canónico de categorías de artículo
    images.ts                   # Redimensionado de imágenes en el navegador antes de subir
    format.ts / errors.ts       # Formateo de fechas, mapeo de errores a mensajes de usuario
  types.ts                      # Tipos de dominio: Articulo, Reserva, Bloqueo

docs/
  supabase-schema.sql                      # Esquema de referencia (articulos, reservas, bloqueos)
  supabase-rls-policies.sql                # Row Level Security + bloqueo de subida anónima
  supabase-exclusion-constraint.sql         # Constraint a nivel de BD: no solapar reservas
  supabase-bloqueos-exclusion-constraint.sql# Constraint a nivel de BD: no solapar bloqueos
  supabase-articulo-imagen.sql              # Columna imagen_url + policies de Storage
  supabase-actualizar-categorias-mayusculas.sql
  supabase-limpiar-datos-prueba.sql
  superpowers/
    specs/   # Decisiones de diseño de cada funcionalidad y por qué se tomaron
    plans/   # Plan de implementación tarea por tarea de cada funcionalidad
```

## Modelo de datos

Tres tablas en Postgres (Supabase), documentadas en [`docs/supabase-schema.sql`](docs/supabase-schema.sql):

- **`articulos`** — `nombre`, `categoria`, `estado` (`disponible` / `mantenimiento` / `baja`), `imagen_url`.
- **`reservas`** — `articulo_id` (FK `on delete restrict`), datos de cliente (`cliente_nombre`, `cliente_telefono`, `cliente_email` opcional), `fecha_inicio`/`fecha_fin`, `estado` (`pendiente` / `confirmada` / `cancelada` / `completada`), `notas`.
- **`bloqueos`** — periodos de mantenimiento por artículo, sin reserva asociada: `articulo_id`, `fecha_inicio`/`fecha_fin`, `motivo`.

Las fechas se tratan como intervalos semiabiertos `[fecha_inicio, fecha_fin)` — ver [`src/lib/disponibilidad.ts`](src/lib/disponibilidad.ts) — para que una reserva que termina un día y otra que empieza ese mismo día no se consideren solapadas.

La disponibilidad se valida dos veces:
1. En el cliente, antes de guardar (`hayConflictoDisponibilidad` en `src/lib/supabase.ts`).
2. En la base de datos, con `EXCLUDE` constraints (`docs/supabase-exclusion-constraint.sql`, `docs/supabase-bloqueos-exclusion-constraint.sql`) que cierran la carrera de dos escrituras concurrentes casi simultáneas.

El acceso está protegido con Row Level Security (`docs/supabase-rls-policies.sql`): solo usuarios autenticados vía Clerk pueden leer o escribir en `articulos`, `reservas` y `bloqueos`, y la subida de imágenes al Storage de Supabase requiere sesión iniciada.

## Instalación

Requiere una cuenta de [Clerk](https://clerk.com) (autenticación) y un proyecto de [Supabase](https://supabase.com) (base de datos) ya creados, con Clerk registrado como proveedor de Third-Party Auth en Supabase (ver cabecera de `docs/supabase-rls-policies.sql`) y el esquema de `docs/` aplicado.

```bash
npm install
cp .env.example .env.local
```

Rellena `.env.local` con tus credenciales:

| Variable | Dónde encontrarla |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys → Publishable key |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

```bash
npm run dev
```

## Scripts disponibles

- `npm run dev` — servidor de desarrollo (Vite)
- `npm run build` — build de producción (`tsc -b && vite build`)
- `npm run preview` — sirve el build de producción localmente
- `npm run lint` — ESLint sobre todo el proyecto
- `npm run test` — tests unitarios (Vitest)

## Despliegue

La app es 100% estática (Vite genera HTML/JS/CSS en `dist/`; Clerk y Supabase se llaman directamente desde el navegador, sin servidor propio), así que cualquier hosting de sitios estáticos sirve. Recomendado: **Cloudflare Pages** — ancho de banda y peticiones ilimitados en el plan gratis, nunca se duerme (no es un proceso que consuma "horas", se sirve desde su CDN), y permite uso comercial sin restricción en el plan free.

Configuración en el dashboard de Cloudflare Pages (Workers & Pages → Create → conectar el repo de GitHub):

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Variables de entorno** (Settings → Environment variables, en Production y Preview): `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Las cabeceras de seguridad (CSP, `X-Frame-Options`, etc.) se aplican vía [`public/_headers`](public/_headers), que Vite copia a `dist/_headers` en cada build — es la convención de Cloudflare Pages (y de Netlify) para cabeceras HTTP personalizadas.

También incluye `vercel.json` por si se despliega en Vercel en su lugar — mismas cabeceras, sintaxis distinta. Ten en cuenta que el plan Hobby (gratis) de Vercel prohíbe en sus términos el uso comercial; como esta app gestiona las reservas de un negocio real, Cloudflare Pages es la opción más segura a nivel de términos de servicio además de la más generosa en cuota.

## Seguridad y privacidad

- Row Level Security en las tres tablas y en el bucket de Storage de imágenes — sin sesión de Clerk válida, la clave anónima de Supabase no da acceso a nada.
- El formulario de reserva muestra un aviso de privacidad (datos recogidos, base legal, plazo de conservación, cómo pedir el borrado) y pide explícitamente no incluir datos de salud u otra información sensible en las notas.
- El historial permite borrar permanentemente los datos de un cliente de una reserva concreta, para atender solicitudes de derecho al olvido.
- Un artículo con reservas o bloqueos asociados no se puede eliminar (`on delete restrict`) — hay que pasarlo a estado `baja` para no perder el historial.

## Licencia

Código propietario — todos los derechos reservados. Se publica como referencia, no como software de uso libre; ver [`LICENSE`](LICENSE). Para licencias de uso comercial, contacta con el titular del copyright.

## Documentación de diseño

Cada funcionalidad significativa tiene su spec y su plan de implementación en `docs/superpowers/`:

- [`docs/superpowers/specs/`](docs/superpowers/specs/) — decisiones de diseño y por qué se tomaron.
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — planes de implementación tarea por tarea.

Estos documentos existen para que cualquiera que retome el proyecto entienda el razonamiento detrás del código, no solo el resultado final.
