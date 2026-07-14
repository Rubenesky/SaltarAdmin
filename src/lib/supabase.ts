import { createClient } from '@supabase/supabase-js'
import type {
  Articulo,
  ArticuloEstado,
  Bloqueo,
  Reserva,
  ReservaConArticulo,
  ReservaEstado,
} from '../types'

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>
      }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await window.Clerk?.session?.getToken()) ?? null,
})

// Artículos

export const getArticulos = async (): Promise<Articulo[]> => {
  const { data, error } = await supabase.from('articulos').select('*').order('nombre')
  if (error) throw error
  return data ?? []
}

export const getArticulosDisponibles = async (): Promise<Articulo[]> => {
  const { data, error } = await supabase
    .from('articulos')
    .select('*')
    .eq('estado', 'disponible')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export const uploadArticuloImagen = async (file: File): Promise<string> => {
  const path = crypto.randomUUID()
  const { error } = await supabase.storage.from('articulo-imagenes').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('articulo-imagenes').getPublicUrl(path)
  return data.publicUrl
}

export const createArticulo = async (articulo: {
  nombre: string
  categoria: string
  estado: ArticuloEstado
  imagen_url?: string | null
}): Promise<Articulo> => {
  const { data, error } = await supabase.from('articulos').insert([articulo]).select().single()
  if (error) throw error
  return data
}

export const updateArticuloEstado = async (id: string, estado: ArticuloEstado): Promise<void> => {
  const { error } = await supabase.from('articulos').update({ estado }).eq('id', id)
  if (error) throw error
}

export const deleteArticulo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('articulos').delete().eq('id', id)
  if (error) throw error
}

// Reservas

export const getReservas = async (): Promise<ReservaConArticulo[]> => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, articulos(nombre)')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReservaConArticulo[]
}

export const getReservasPorArticulo = async (articuloId: string): Promise<Reserva[]> => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('articulo_id', articuloId)
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const createReserva = async (reserva: {
  articulo_id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email?: string | null
  fecha_inicio: string
  fecha_fin: string
  notas?: string | null
}): Promise<Reserva> => {
  const { data, error } = await supabase
    .from('reservas')
    .insert([{ ...reserva, estado: 'confirmada' }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateReservaEstado = async (id: string, estado: ReservaEstado): Promise<void> => {
  const { error } = await supabase.from('reservas').update({ estado }).eq('id', id)
  if (error) throw error
}

export const updateReserva = async (
  id: string,
  updates: {
    cliente_nombre: string
    cliente_telefono: string
    cliente_email?: string | null
    fecha_inicio: string
    fecha_fin: string
    notas?: string | null
  }
): Promise<void> => {
  const { error } = await supabase.from('reservas').update(updates).eq('id', id)
  if (error) throw error
}

export const hayConflictoReserva = async (
  articuloId: string,
  fechaInicio: string,
  fechaFin: string,
  excluirReservaId?: string
): Promise<boolean> => {
  let reservaQuery = supabase
    .from('reservas')
    .select('id')
    .eq('articulo_id', articuloId)
    .neq('estado', 'cancelada')
    .lt('fecha_inicio', fechaFin)
    .gt('fecha_fin', fechaInicio)
  if (excluirReservaId) reservaQuery = reservaQuery.neq('id', excluirReservaId)

  const [reservaResult, bloqueoResult] = await Promise.all([
    reservaQuery,
    supabase
      .from('bloqueos')
      .select('id')
      .eq('articulo_id', articuloId)
      .lt('fecha_inicio', fechaFin)
      .gt('fecha_fin', fechaInicio),
  ])

  if (reservaResult.error) throw reservaResult.error
  if (bloqueoResult.error) throw bloqueoResult.error

  return (reservaResult.data ?? []).length > 0 || (bloqueoResult.data ?? []).length > 0
}

// Bloqueos

export const getBloqueos = async (articuloId?: string): Promise<Bloqueo[]> => {
  let query = supabase.from('bloqueos').select('*').order('fecha_inicio')
  if (articuloId) query = query.eq('articulo_id', articuloId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export const createBloqueo = async (bloqueo: {
  articulo_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
}): Promise<Bloqueo> => {
  const { data, error } = await supabase.from('bloqueos').insert([bloqueo]).select().single()
  if (error) throw error
  return data
}

export const deleteBloqueo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('bloqueos').delete().eq('id', id)
  if (error) throw error
}
