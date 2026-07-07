export type ArticuloEstado = 'disponible' | 'mantenimiento' | 'baja'
export type ReservaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'

export interface Articulo {
  id: string
  nombre: string
  categoria: string
  estado: ArticuloEstado
  created_at: string
  updated_at: string
}

export interface Reserva {
  id: string
  articulo_id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string | null
  fecha_inicio: string
  fecha_fin: string
  estado: ReservaEstado
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ReservaConArticulo extends Reserva {
  articulos: { nombre: string } | null
}

export interface Bloqueo {
  id: string
  articulo_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  created_at: string
}
