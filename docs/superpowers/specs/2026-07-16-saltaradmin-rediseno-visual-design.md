# SaltarAdmin — Rediseño visual profesional (Design)

> Solicitado por el usuario antes del despliegue de la app para uso de su hermano y sus socios. La app ya pasó por una ronda de responsive/mobile design y por la corrección de los bloqueantes críticos de la auditoría de 11 expertos; este rediseño es puramente visual, sin cambios de arquitectura ni de funcionalidad.

## Problema

- El aspecto actual es genérico: nav con gradiente azul-a-naranja, 6 botones de nav cada uno con un color distinto sin relación entre sí, y componentes que usan clases sueltas de Tailwind (`bg-blue-600`, `bg-green-600`, `bg-red-600`...) en vez de un sistema de diseño coherente.
- `tailwind.config.js` ya define un token parcial (`primary`, `accent`, `success`, `danger`) pero casi ningún componente lo usa — la mayoría del código ignora esos tokens y usa colores de Tailwind directamente.
- Sin tipografía definida más allá de Inter (fuente segura por defecto, sin personalidad).

## Dirección de diseño (confirmada con el usuario)

- **Tono**: serio y neutro, como una herramienta de gestión estándar (tipo Stripe Dashboard / Linear) — no una identidad lúdica de fiestas/hinchables, ya que es una herramienta interna de gestión, no algo que vean los clientes finales.
- **Paleta** ("Trust Teal", de la base de referencia de diseño consultada — categoría Real Estate/Property, elegida para diferenciarse del azul genérico que ya tenía la app):
  - Primario: `#0F766E` (teal profundo)
  - Primario oscuro / texto de marca: `#134E4A`
  - Acento secundario: `#0369A1` (azul, para contraste puntual, no como color dominante)
  - Semánticos (sin cambios de significado, ya establecidos en el código): éxito `#16a34a`, peligro `#dc2626`, aviso `#d97706` (nuevo, para estado "pendiente")
  - Neutro de superficie: `#f3f4f6` (gris muy claro, ya existente como `light-gray`)
- **Tipografía** ("Corporate Trust"): `Lexend` para títulos/encabezados (diseñada para legibilidad/accesibilidad), `Source Sans 3` para el cuerpo del texto — reemplaza `Inter` como fuente única actual.
- **Enfoque de implementación**: cambios de configuración de Tailwind + sustitución de clases en los componentes existentes. Sin extraer componentes compartidos (`<Modal>`, `<Button>`) ni cambiar la estructura de archivos — esa refactorización quedó explícitamente aparcada para otra ronda, a petición del usuario.

## Cambios

1. **`tailwind.config.js`**: actualizar `colors.primary` (`#0F766E`), `colors.accent` (`#0369A1`), añadir `colors.warning` (`#d97706`), mantener `colors.success`/`colors.danger`/`colors['light-gray']` sin cambios de valor. Actualizar `fontFamily.sans` a `Source Sans 3` y añadir `fontFamily.heading` con `Lexend`.
2. **`index.html`**: sustituir el `<link>` de Google Fonts de Inter por Lexend + Source Sans 3 (mismo mecanismo de carga ya usado, sin cambiar de enfoque).
3. **`src/App.tsx`**: nav de `bg-gradient-to-r from-blue-700 to-orange-500` a `bg-primary` sólido. Los 6 botones de navegación (hoy con colores dispares: verde, índigo, azul, gris...) pasan a un estilo unificado: `bg-primary` para el botón de la vista activa, estilo neutro/outline para el resto.
4. **Los 7 modales** (`ReserveModal.tsx`, `ManageArticleModal.tsx`, `GestionarReservasModal.tsx`, `ArticleDetailModal.tsx`, `DayReservationsModal.tsx`, `PrivacyNoticeModal.tsx`): sustituir botones de acción principal (`bg-green-600`, `bg-blue-600`...) por `bg-primary`, botones destructivos por `bg-danger` (ya usado en algunos, se generaliza), botones de cancelar/cerrar por un estilo neutro consistente (gris claro, sin variar entre modales).
5. **`src/components/Calendar.tsx`** y **`src/components/MonthCalendarView.tsx`**: alinear los colores de eventos/celdas a la nueva paleta (usando los tokens `primary`/`success`/`danger`/`warning` según el estado, no colores de Tailwind sueltos), sin cambiar qué significa cada color (verde sigue siendo confirmada, rojo sigue siendo cancelada, etc.).
6. **`src/components/ReservationHistory.tsx`**: los badges de `ESTADO_STYLES` (hoy `bg-yellow-100 text-yellow-800`, etc.) pasan a usar los tokens semánticos correspondientes.

## Verificación

- Con el bypass temporal de sesión (no requiere sesión real, es un cambio puramente visual): recorrer cada vista (Dashboard, Calendario, Historial) y abrir cada uno de los 7 modales, confirmando visualmente que:
  - No queda ningún `bg-blue-600`, `bg-green-600`, `bg-red-600`, `bg-indigo-600`, `bg-gray-600`/`gray-800`, ni el gradiente azul-naranja del nav (verificable también con `grep` en `src/`).
  - Los títulos usan la tipografía Lexend (peso más marcado, visualmente distinta del cuerpo de texto).
  - Los botones de acción principal son consistentemente del mismo color teal en todos los modales.
  - Los botones destructivos (Eliminar, Cancelar Reserva) son consistentemente rojos.
- Confirmar que ningún flujo funcional cambia — es puramente visual, no debe haber ninguna regresión de comportamiento (los tests de comportamiento ya se hicieron en rondas anteriores; aquí solo se verifica que nada se rompió al cambiar clases CSS).
- Revisar en un móvil/viewport estrecho (ya que hubo una ronda de responsive design previa) que el cambio de colores no rompe ningún layout existente.

## Fuera de alcance

- Extraer componentes compartidos (`<Modal>`, `<Button>`) — aparcado explícitamente por el usuario para otra ronda.
- Cualquier cambio de estructura, layout, o funcionalidad — solo colores y tipografía.
- Los 6 botones de mejora adicional anotados de la auditoría (ErrorBoundary, paginación, accesibilidad de foco, etc.) — no forman parte de este rediseño visual.
