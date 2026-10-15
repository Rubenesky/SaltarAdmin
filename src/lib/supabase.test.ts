import { beforeEach, describe, expect, it, vi } from 'vitest'

// hayConflictoDisponibilidad es la función que realmente corre en producción:
// combina dos queries a Supabase (reservas + bloqueos) con Promise.all. Aquí
// mockeamos el cliente para poder controlar qué filas "existen" en cada
// tabla, y dejamos que el builder falso aplique los mismos filtros
// (eq/neq/lt/gt) que usaría Postgres, para que el test siga ejerciendo la
// lógica real de la función y no solo el mock.
let tablesData: Record<string, Record<string, unknown>[]> = {}

type Filter = (row: Record<string, unknown>) => boolean

const makeBuilder = (table: string) => {
  const filters: Filter[] = []
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters.push((row) => row[col] === val)
      return builder
    },
    neq: (col: string, val: unknown) => {
      filters.push((row) => row[col] !== val)
      return builder
    },
    lt: (col: string, val: unknown) => {
      filters.push((row) => (row[col] as string) < (val as string))
      return builder
    },
    gt: (col: string, val: unknown) => {
      filters.push((row) => (row[col] as string) > (val as string))
      return builder
    },
    then: (
      resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown,
      reject?: (reason: unknown) => unknown
    ) => {
      const rows = tablesData[table] ?? []
      const data = rows.filter((row) => filters.every((f) => f(row)))
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    },
  }
  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => makeBuilder(table),
  }),
}))

const { hayConflictoDisponibilidad } = await import('./supabase')

describe('hayConflictoDisponibilidad', () => {
  beforeEach(() => {
    tablesData = { reservas: [], bloqueos: [] }
  })

  it('detecta conflicto cuando se solapa con una reserva activa', async () => {
    tablesData.reservas = [
      {
        id: 'r1',
        articulo_id: 'a1',
        estado: 'confirmada',
        fecha_inicio: '2026-01-10',
        fecha_fin: '2026-01-15',
      },
    ]

    const conflicto = await hayConflictoDisponibilidad('a1', '2026-01-12', '2026-01-20')
    expect(conflicto).toBe(true)
  })

  it('detecta conflicto cuando se solapa con un bloqueo', async () => {
    tablesData.bloqueos = [
      { id: 'b1', articulo_id: 'a1', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-10' },
    ]

    const conflicto = await hayConflictoDisponibilidad('a1', '2026-02-05', '2026-02-06')
    expect(conflicto).toBe(true)
  })

  it('excluirReservaId excluye la propia reserva al editar (sin falso conflicto)', async () => {
    tablesData.reservas = [
      {
        id: 'r1',
        articulo_id: 'a1',
        estado: 'confirmada',
        fecha_inicio: '2026-03-10',
        fecha_fin: '2026-03-15',
      },
    ]

    const conflicto = await hayConflictoDisponibilidad('a1', '2026-03-10', '2026-03-15', 'r1')
    expect(conflicto).toBe(false)
  })
})
