# SaltarAdmin — Rediseño visual ambicioso (Design)

> Segunda ronda de rediseño. La primera ronda (paleta teal + tipografía Lexend/Source Sans 3 sobre la misma estructura) quedó guardada sin fusionar en `worktree-saltaradmin-rediseno-visual` — el usuario la consideró insuficiente ("esta bien pero... esperaba un cambio muchisimo mas grande y profesional... la pagina debe ser totalmente diferente no el mismo diseño con colores diferentes"). Esta ronda sustituye a la anterior por completo y parte de nuevo desde `master` (sin los cambios de la ronda 1).

## Dirección de diseño

Estilo **"Minimalism & Swiss Style"**, tomado literalmente del catálogo de referencia consultado (`ui-ux-pro-max`, `styles.csv`, entrada #1) — su columna "Best For" dice textualmente: *"Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools"*. Confirmado con el usuario en dos rondas de preguntas: mantiene el nav horizontal (rechazó explícitamente la propuesta de sidebar), pero exige un cambio real de estructura visual, no solo de color.

## Decisiones técnicas (confirmadas con el usuario)

1. **Nav horizontal, restilizado**: fondo casi negro (`#111827`, gray-900) en vez de teal sólido o gradiente, con una línea de acento teal de 2-3px en el borde inferior. Texto blanco. Sin gradiente.
2. **Esquinas rectas**: `rounded-lg`/`rounded-none` mínimo en vez de las esquinas redondeadas actuales, en tarjetas, modales y botones.
3. **Sin sombras decorativas**: `shadow-xl`/`shadow-lg` se sustituyen por un borde fino de 1-2px. Única excepción: el popover flotante del calendario mantiene sombra real, porque ahí la elevación es funcional (indica que flota sobre el contenido).
4. **Un único acento, con moderación**: el color primario (teal `#0F766E`, reutilizado de la ronda 1 — el tono en sí nunca fue la queja) se usa solo en la acción principal de cada pantalla. El resto de botones antes "rellenos grises" pasan a **borde sin relleno** (outline). Los destructivos se quedan en rojo sólido, sin cambios (ya son semánticamente correctos).
5. **Jerarquía tipográfica marcada**: títulos con más peso y tamaño (`font-heading font-bold`, subiendo de `text-xl` a `text-2xl` en títulos de modal); etiquetas pequeñas (categorías, cabeceras de tabla) en mayúsculas con tracking — extendiendo el patrón que ya existe en las cabeceras de `ReservationHistory.tsx` a toda la app.
6. **Ritmo de espaciado más disciplinado**: sustituir el `mb-4` heredado repetido sin criterio por un patrón de espaciado vertical consistente entre título/contenido/acciones dentro de cada modal.
7. **Tipografía**: se mantiene Lexend (títulos) + Source Sans 3 (cuerpo) de la ronda 1 — el tipo de letra nunca fue parte de la queja del usuario.

## Alcance

- Mismos 10 archivos que la ronda 1 (`tailwind.config.js`, `index.html`, `src/index.css`, `App.tsx`, los 7 modales, `Calendar.tsx`, `MonthCalendarView.tsx`, `ReservationHistory.tsx`) — pero partiendo de `master` (sin los cambios de la ronda 1, que quedan descartados en la práctica al no fusionarse nunca).
- Sigue siendo solo CSS/clases sobre los componentes existentes — **no se extraen componentes compartidos** (`<Modal>`, `<Button>`) en esta ronda, misma decisión que la ronda 1.
- Ningún cambio de comportamiento, lógica, ni estructura de datos.

## Verificación

- Recorrido visual completo (con bypass temporal para regresión estructural, y con sesión real para el recorrido final) confirmando: nav oscuro con línea de acento, esquinas rectas en todos los modales/tarjetas, sin sombras decorativas salvo el popover del calendario, botones secundarios en outline (no relleno gris), títulos con más peso/tamaño.
- Confirmar que ningún flujo funcional cambia — mismos tests de comportamiento ya cubiertos en rondas anteriores.
- Confirmar que la vista móvil (ronda de responsive design anterior) sigue funcionando.

## Fuera de alcance

- Componentes compartidos (`<Modal>`, `<Button>`) — misma decisión que la ronda 1.
- Cambio de orientación del nav (sidebar) — explícitamente rechazado por el usuario.
- Cualquier cambio de tipografía — se mantiene Lexend/Source Sans 3 de la ronda 1.
