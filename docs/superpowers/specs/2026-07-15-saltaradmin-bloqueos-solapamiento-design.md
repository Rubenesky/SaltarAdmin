# SaltarAdmin — Bloqueos de mantenimiento sin comprobar solapamiento (Design)

> Bloqueante #3 del informe de auditoría pre-despliegue de 11 expertos (2026-07-14). Señalado por el experto de Base de Datos (5/10).

## Problema

- `src/components/ArticleDetailModal.tsx:42-66` (`handleCrearBloqueo`) crea un bloqueo de mantenimiento comprobando únicamente que `nuevoInicio` no sea posterior a `nuevoFin` — no comprueba si esas fechas ya tienen una reserva confirmada para el mismo artículo, ni si se solapan con otro bloqueo ya existente.
- No existe ninguna restricción a nivel de base de datos sobre la tabla `bloqueos`; la restricción de exclusión aplicada en el bloqueante #2 solo cubre `reservas`.
- Resultado: un artículo puede quedar "bloqueado por mantenimiento" y "reservado" a la vez para las mismas fechas, sin que nada lo impida.
- `src/lib/supabase.ts:139` (`hayConflictoReserva`) ya comprueba solapamiento contra `reservas` Y `bloqueos` a la vez (usa `Promise.all` con ambas tablas) — es exactamente la comprobación que falta en la creación de bloqueos, solo que hoy únicamente la usan `ReserveModal.tsx` y `GestionarReservasModal.tsx`.

## Decisiones de alcance (confirmadas con el usuario)

- **Renombrar `hayConflictoReserva` → `hayConflictoDisponibilidad`**, ya que pasa a usarse también para crear bloqueos y el nombre actual dejaría de ser preciso en ese punto de llamada. Sin cambio de lógica ni de firma, solo de nombre — se actualizan sus 3 puntos de llamada (`ReserveModal.tsx`, `GestionarReservasModal.tsx`, y el nuevo en `ArticleDetailModal.tsx`).
- **Restricción de base de datos limitada a bloqueo-contra-bloqueo** (mismo artículo). Un `EXCLUDE constraint` de Postgres solo compara filas dentro de la misma tabla, así que no puede cubrir el caso cruzado reserva-bloqueo a nivel de base de datos — ese caso sigue dependiendo de la comprobación en el cliente, exactamente igual que ya ocurre hoy. Se descarta explícitamente una solución con trigger para el caso cruzado: ampliaría el alcance retroactivamente al bloqueante #2 y añade complejidad (función PL/pgSQL) no solicitada para este bloqueante.

## Cambios

1. **`src/lib/supabase.ts`**: renombrar `hayConflictoReserva` a `hayConflictoDisponibilidad` (misma implementación, mismo tipo de retorno `Promise<boolean>`, misma firma `(articuloId, fechaInicio, fechaFin, excluirReservaId?)`).
2. **`src/components/ReserveModal.tsx:77`** y **`src/components/GestionarReservasModal.tsx:77`**: actualizar el import y la llamada al nuevo nombre. Sin ningún otro cambio de comportamiento.
3. **`src/components/ArticleDetailModal.tsx` — `handleCrearBloqueo`**:
   - Cambiar la validación de fechas de `nuevoInicio > nuevoFin` a `nuevoInicio >= nuevoFin`, con el mensaje "La fecha de inicio debe ser anterior a la fecha de fin." (mismo ajuste ya aplicado en `ReserveModal.tsx` para el bloqueante #2).
   - Antes de `createBloqueo`, llamar a `hayConflictoDisponibilidad(articulo.id, nuevoInicio, nuevoFin)`; si devuelve `true`, mostrar `'Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).'` y no crear el bloqueo.
   - En el `catch`, manejar el código `23P01` con el mismo patrón ya usado en `ManageArticleModal.tsx` y `ReserveModal.tsx`, mostrando el mismo mensaje de conflicto.
4. **Base de datos**: nuevo script SQL con una restricción `EXCLUDE USING gist` sobre `bloqueos` (`articulo_id WITH =`, `daterange(fecha_inicio, fecha_fin, '[)') WITH &&`), sin cláusula `WHERE` (la tabla `bloqueos` no tiene campo de estado/cancelado).

## Verificación

- Con sesión real: intentar crear un bloqueo para un artículo en fechas que ya tienen una reserva confirmada → debe rechazarse con el mensaje de conflicto.
- Intentar crear un bloqueo que se solape con otro bloqueo ya existente del mismo artículo → debe rechazarse igual.
- Intentar crear un bloqueo con fecha de inicio igual a la de fin → debe rechazarse con el mensaje de validación de fechas.
- Confirmar que crear una reserva y editar una reserva (los dos flujos que ya usaban la función renombrada) siguen funcionando exactamente igual que antes.
- Confirmar que crear un bloqueo válido (sin conflicto) sigue funcionando.

## Fuera de alcance

- Protección a nivel de base de datos para el caso cruzado reserva-bloqueo (requeriría un trigger; no solicitado).
- Cualquier cambio de UI visible más allá de los mensajes de error.
- Edición de bloqueos existentes (solo se pueden crear y eliminar, no editar) — no es parte de este bloqueante.
