export const formatFecha = (fecha: string): string => {
  const [year, month, day] = fecha.split('-')
  return `${day}-${month}-${year}`
}
