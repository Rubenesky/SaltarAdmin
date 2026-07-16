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
  // Empty intervals (inicio >= fin) don't overlap with anything
  if (aInicio >= aFin || bInicio >= bFin) {
    return false
  }
  return aInicio < bFin && aFin > bInicio
}
