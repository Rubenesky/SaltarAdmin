import React, { useEffect, useState } from 'react'
import { getReservas, hayConflictoReserva, updateReserva, updateReservaEstado } from '../lib/supabase'
import type { ReservaConArticulo } from '../types'

interface GestionarReservasModalProps {
  isOpen: boolean
  onClose: () => void
  onReservasChanged: () => void
}

const GestionarReservasModal: React.FC<GestionarReservasModalProps> = ({ isOpen, onClose, onReservasChanged }) => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editInicio, setEditInicio] = useState('')
  const [editFin, setEditFin] = useState('')
  const [editNotas, setEditNotas] = useState('')

  const cargarReservas = async () => {
    setLoading(true)
    try {
      const data = await getReservas()
      setReservas(data.filter((r) => r.estado !== 'cancelada'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) cargarReservas()
  }, [isOpen])

  if (!isOpen) return null

  const reservasFiltradas = reservas.filter((r) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return r.cliente_nombre.toLowerCase().includes(term) || r.cliente_telefono.toLowerCase().includes(term)
  })

  const handleEmpezarEdicion = (reserva: ReservaConArticulo) => {
    setError(null)
    setEditingId(reserva.id)
    setEditNombre(reserva.cliente_nombre)
    setEditTelefono(reserva.cliente_telefono)
    setEditEmail(reserva.cliente_email ?? '')
    setEditInicio(reserva.fecha_inicio)
    setEditFin(reserva.fecha_fin)
    setEditNotas(reserva.notas ?? '')
  }

  const handleCancelarEdicion = () => {
    setEditingId(null)
  }

  const handleGuardarEdicion = async (reserva: ReservaConArticulo) => {
    setError(null)

    if (editInicio > editFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }

    try {
      const conflicto = await hayConflictoReserva(reserva.articulo_id, editInicio, editFin, reserva.id)
      if (conflicto) {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
        return
      }

      await updateReserva(reserva.id, {
        cliente_nombre: editNombre,
        cliente_telefono: editTelefono,
        cliente_email: editEmail || null,
        fecha_inicio: editInicio,
        fecha_fin: editFin,
        notas: editNotas || null,
      })
      setEditingId(null)
      await cargarReservas()
      onReservasChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reserva.')
    }
  }

  const handleCancelarReserva = async (id: string) => {
    setError(null)
    try {
      await updateReservaEstado(id, 'cancelada')
      await cargarReservas()
      onReservasChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">📝 Gestionar Reservas</h2>

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

        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : reservas.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay reservas activas.</p>
        ) : reservasFiltradas.length === 0 ? (
          <p className="text-gray-500 text-sm">No se encontraron resultados.</p>
        ) : (
          <ul className="divide-y divide-gray-200 border rounded-lg">
            {reservasFiltradas.map((reserva) =>
              editingId === reserva.id ? (
                <li key={reserva.id} className="p-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label htmlFor={`editNombre-${reserva.id}`} className="block text-xs text-gray-600">Nombre:</label>
                      <input
                        type="text"
                        id={`editNombre-${reserva.id}`}
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`editTelefono-${reserva.id}`} className="block text-xs text-gray-600">Teléfono:</label>
                      <input
                        type="text"
                        id={`editTelefono-${reserva.id}`}
                        value={editTelefono}
                        onChange={(e) => setEditTelefono(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`editEmail-${reserva.id}`} className="block text-xs text-gray-600">Email:</label>
                      <input
                        type="email"
                        id={`editEmail-${reserva.id}`}
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div />
                    <div>
                      <label htmlFor={`editInicio-${reserva.id}`} className="block text-xs text-gray-600">Desde:</label>
                      <input
                        type="date"
                        id={`editInicio-${reserva.id}`}
                        value={editInicio}
                        onChange={(e) => setEditInicio(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`editFin-${reserva.id}`} className="block text-xs text-gray-600">Hasta:</label>
                      <input
                        type="date"
                        id={`editFin-${reserva.id}`}
                        value={editFin}
                        onChange={(e) => setEditFin(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor={`editNotas-${reserva.id}`} className="block text-xs text-gray-600">Notas:</label>
                      <textarea
                        id={`editNotas-${reserva.id}`}
                        value={editNotas}
                        onChange={(e) => setEditNotas(e.target.value)}
                        className="w-full px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleGuardarEdicion(reserva)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelarEdicion}
                    className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-400 transition text-sm ml-2"
                  >
                    Cancelar edición
                  </button>
                </li>
              ) : (
                <li key={reserva.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">
                      {reserva.cliente_nombre} · {reserva.articulos?.nombre ?? '—'}
                    </p>
                    <p className="text-gray-500">
                      📞 {reserva.cliente_telefono} · 📅 {reserva.fecha_inicio} → {reserva.fecha_fin} · {reserva.estado}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEmpezarEdicion(reserva)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleCancelarReserva(reserva.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default GestionarReservasModal
