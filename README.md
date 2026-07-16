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
