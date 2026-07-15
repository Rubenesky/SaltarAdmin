# SaltarAdmin — Comprobación de doble reserva en el flujo principal (Design)

> Bloqueante #2 del informe de auditoría pre-despliegue de 11 expertos (2026-07-14). Señalado independientemente por QA/Testing (3/10) y Base de datos (5/10).

## Problema

- `src/components/ReserveModal.tsx:77` solo llama a `hayConflictoReserva` cuando `contextoFijo` es `false` (formulario independiente "Nueva Reserva"). Cuando se reserva arrastrando una celda del calendario (`contextoFijo === true`, la vía más habitual de reservar), la comprobación nunca se ejecuta — la única defensa es `selectOverlap={false}` de FullCalendar, que solo conoce los eventos ya cargados en el cliente.
- `docs/supabase-exclusion-constraint.sql` (la restricción a nivel de base de datos pensada como último cortafuegos) nunca se aplicó a la base de datos real — confirmado con `select conname from pg_constraint where conname = 'no_solapamiento_reservas';`, que no devuelve filas. El código tampoco gestiona el código de error `23P01` que produciría esa restricción si existiera.
- Hallazgo relacionado, mismo bloque de código: `ReserveModal.tsx:70` solo rechaza `finalFechaInicio > finalFechaFin`, aceptando `finalFechaInicio === finalFechaFin` sin bloquear ningún día real (por la convención de intervalo semiabierto `[inicio, fin)` que usa toda la app).

## Alcance (confirmado con el usuario)

- Incluye la corrección de la validación de fechas iguales, ya que comparte el mismo bloque de código que se va a tocar.
- No incluye los bloqueos de mantenimiento (`ArticleDetailModal.tsx`), que tienen el mismo problema de raíz pero son el bloqueante #3 de la auditoría — se aborda en otra ronda.

## Cambios

1. **`ReserveModal.tsx:77`** — eliminar el condicional `if (!contextoFijo)` alrededor de la llamada a `hayConflictoReserva`, de forma que se ejecute siempre antes de crear la reserva, sin importar si viene del formulario independiente o de arrastrar en el calendario.
2. **`ReserveModal.tsx:70`** — cambiar la comparación `finalFechaInicio > finalFechaFin` por `finalFechaInicio >= finalFechaFin`, rechazando también las fechas de inicio y fin iguales.
3. **Manejo del error `23P01`** en el `catch` de `handleSubmit` — mismo patrón ya usado en `ManageArticleModal.tsx:108-115` para el código `23503`: extraer `(err as { code?: string })?.code`, y si es `23P01`, mostrar `'Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).'` en vez del error crudo de Postgres; en cualquier otro caso, mantener el fallback actual.
4. **Base de datos**: aplicar `docs/supabase-exclusion-constraint.sql` (confirmado que nunca se aplicó) — paso manual del usuario en el SQL Editor de Supabase, mismo patrón que en el bloqueante #1.

## Verificación

- Con sesión real iniciada: reservar arrastrando una celda del calendario sobre fechas ya reservadas para el mismo artículo → debe rechazarse con el mensaje de conflicto, sin llegar a crear la reserva.
- Intentar crear una reserva con `Desde` y `Hasta` iguales → debe rechazarse con el mensaje de validación de fechas.
- Confirmar que el flujo del formulario independiente ("Nueva Reserva") sigue funcionando exactamente igual que antes (no debe cambiar de comportamiento, solo se añade la misma comprobación a la otra vía de entrada).
- Tras aplicar la restricción de base de datos, forzar el caso límite de dos inserciones casi simultáneas no es práctico de reproducir manualmente; se acepta como verificado por inspección de código + el hecho de que la restricción ya se usa con éxito en otras tablas de este mismo proyecto.

## Fuera de alcance

- Bloqueos de mantenimiento sin comprobación de solapamiento (`ArticleDetailModal.tsx`) — bloqueante #3 de la auditoría.
- Cualquier cambio de UI visible más allá del mensaje de error mostrado.
