# SaltarAdmin — Aviso de privacidad + borrado real de datos (Design)

> Bloqueante #5 del informe de auditoría pre-despliegue de 11 expertos (2026-07-14). Señalado por el experto de RGPD/Privacidad (2/10).

## Problema

- Ningún componente de la app muestra texto legal ni aviso de privacidad. `ReserveModal.tsx` recoge nombre, teléfono, email y notas del cliente sin informar de nada.
- `src/lib/supabase.ts` no tiene ninguna función que borre una reserva de verdad — solo `updateReservaEstado` (cambia el campo `estado` a `'cancelada'`, sin tocar el resto de los datos). Aunque el negocio quisiera atender una petición de borrado de un cliente, hoy no puede: el PII (nombre, teléfono, email, notas) permanece indefinidamente incluso después de cancelar.
- El campo "Notas" de `ReserveModal.tsx` es texto libre sin ninguna indicación, lo que invita a anotar datos sensibles (p. ej. de salud) sin que nadie se dé cuenta de que eso exige un tratamiento especial bajo RGPD.

## Decisiones de alcance (confirmadas con el usuario)

- **Solo borrado manual esta ronda.** El aviso declara por escrito un plazo de retención (12 meses tras la fecha de fin del alquiler, ajustable como decisión de negocio), pero el borrado lo ejecuta el personal manualmente con el nuevo botón — sin tarea programada ni infraestructura de purga automática.
- **Contacto del negocio como marcador de posición.** El texto usa `[NOMBRE DEL NEGOCIO]` y `[EMAIL DE CONTACTO]` de forma visible; el usuario los rellena con los datos reales antes de publicar.
- **El borrado no se restringe por estado de la reserva** — un cliente puede pedir el borrado de una reserva completada, no solo de una cancelada.

## Cambios

1. **Nuevo componente `src/components/PrivacyNoticeModal.tsx`** — modal de solo lectura, mismo patrón visual que los 6 modales ya existentes en la app (fondo oscuro, tarjeta centrada, botón de cierre con `aria-label="Cerrar"`). Sin formulario, sin estado más allá de `isOpen`/`onClose`. Contenido (texto real, ver Task de implementación para el contenido completo): qué datos se recogen, para qué, base legal, plazo de retención, cómo pedir acceso/rectificación/borrado, y los datos de contacto del negocio (marcadores de posición).
2. **`src/components/ReserveModal.tsx`**:
   - Añadir un enlace/botón "Política de privacidad" que abra `PrivacyNoticeModal` (nuevo estado local `modalPrivacidadOpen`).
   - Añadir una línea de ayuda bajo el campo "Notas" pidiendo no anotar datos de salud u otra información sensible.
3. **`src/lib/supabase.ts`**: nueva función `deleteReserva(id: string): Promise<void>` — `DELETE` real sobre la tabla `reservas` por `id`, mismo patrón de manejo de errores (`if (error) throw error`) que `deleteArticulo`/`deleteBloqueo` ya existentes.
4. **`src/components/ReservationHistory.tsx`**: nuevo botón "Eliminar permanentemente" junto al ya existente "Cancelar Reserva", con `window.confirm(...)` explícito advirtiendo que la acción es irreversible y borra los datos del cliente, antes de llamar a `deleteReserva`.

## Verificación

- Con sesión real: abrir "Nueva Reserva", confirmar que el enlace "Política de privacidad" abre el modal con el texto completo y se cierra correctamente.
- Confirmar que el campo "Notas" muestra la línea de ayuda.
- En "Historial", crear una reserva de prueba y usar "Eliminar permanentemente": confirmar que pide confirmación, y que tras confirmar la reserva desaparece de la lista (no solo cambia de estado).
- Confirmar en el panel de Supabase (Table Editor) que la fila realmente se borró de la tabla `reservas`, no que solo cambió su `estado`.
- Confirmar que "Cancelar Reserva" (el flujo ya existente) sigue funcionando exactamente igual que antes.

## Fuera de alcance

- Borrado automático programado (tarea/cron) — decisión explícita del usuario de dejarlo fuera de esta ronda.
- Relleno de los datos reales de contacto del negocio en el texto — lo hace el usuario después, no es una tarea de código.
- Cualquier checkbox de consentimiento explícito en el formulario — la base legal identificada es "ejecución de contrato", que no requiere consentimiento explícito adicional según el propio hallazgo de la auditoría.
