import { describe, expect, it } from 'vitest'
import { intervalosSolapan } from './disponibilidad'

describe('intervalosSolapan', () => {
  it('detecta solapamiento total (mismo rango exacto)', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-10', '2026-01-15')).toBe(true)
  })

  it('detecta solapamiento parcial por la izquierda', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-05', '2026-01-12')).toBe(true)
  })

  it('detecta solapamiento parcial por la derecha', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-12', '2026-01-20')).toBe(true)
  })

  it('detecta cuando un intervalo contiene por completo al otro', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-20', '2026-01-12', '2026-01-15')).toBe(true)
  })

  it('NO detecta solapamiento en intervalos adyacentes (fin de A === inicio de B)', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-01-15', '2026-01-20')).toBe(false)
  })

  it('NO detecta solapamiento en intervalos completamente separados', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-15', '2026-02-01', '2026-02-05')).toBe(false)
  })

  it('NO detecta solapamiento cuando B es un instante dentro de A (intervalo vacío)', () => {
    expect(intervalosSolapan('2026-01-10', '2026-01-20', '2026-01-14', '2026-01-14')).toBe(false)
  })

  it('detecta turno de recogida-y-entrega el mismo día como NO solapado consigo mismo (intervalo vacío)', () => {
    // Un intervalo con inicio === fin es vacío bajo la convención [inicio, fin) —
    // no debe considerarse solapado con nada, ni siquiera con un rango que lo envuelve.
    expect(intervalosSolapan('2026-01-15', '2026-01-15', '2026-01-10', '2026-01-20')).toBe(false)
  })
})
