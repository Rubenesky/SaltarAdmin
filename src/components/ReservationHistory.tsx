import React, { useEffect, useState } from 'react'
import { getReservas, updateReservaEstado } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import type { ReservaConArticulo, ReservaEstado } from '../types'

const ESTADO_STYLES: Record<ReservaEstado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  completada: 'bg-blue-100 text-blue-800',
}

const ESTADOS: ReservaEstado[] = ['pendiente', 'confirmada', 'cancelada', 'completada']

const ReservationHistory: React.FC = () => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const cargarReservas = async () => {
    setLoading(true)
    try {
      const data = await getReservas()
      setReservas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarReservas()
  }, [])

  const handleEstadoChange = async (id: string, estado: ReservaEstado) => {
    setError(null)
    try {
      await updateReservaEstado(id, estado)
      await cargarReservas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la reserva.')
    }
  }

  const reservasFiltradas = reservas.filter((r) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return r.cliente_nombre.toLowerCase().includes(term) || r.cliente_telefono.toLowerCase().includes(term)
  })

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando historial...</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">📋 Historial de Reservas</h2>
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
      )}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha inicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha fin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-gray-500">
                  Sin reservas todavía.
                </td>
              </tr>
            ) : reservasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-gray-500">
                  No se encontraron resultados.
                </td>
              </tr>
            ) : (
              reservasFiltradas.map((reserva) => (
                <tr key={reserva.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reserva.cliente_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.cliente_telefono}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.articulos?.nombre ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatFecha(reserva.fecha_inicio)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatFecha(reserva.fecha_fin)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={reserva.estado}
                      onChange={(e) => handleEstadoChange(reserva.id, e.target.value as ReservaEstado)}
                      className={`px-2 py-1 rounded ${ESTADO_STYLES[reserva.estado]}`}
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEstadoChange(reserva.id, 'cancelada')}
                      disabled={reserva.estado === 'cancelada'}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition disabled:opacity-40"
                    >
                      Cancelar Reserva
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReservationHistory
