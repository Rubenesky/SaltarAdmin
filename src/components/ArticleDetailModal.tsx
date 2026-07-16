import React, { useEffect, useState } from 'react'
import { createBloqueo, deleteBloqueo, getBloqueos, getReservasPorArticulo, hayConflictoDisponibilidad } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import type { Articulo, Bloqueo, Reserva } from '../types'

interface ArticleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  articulo: Articulo
  onBloqueosChanged: () => void
}

const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ isOpen, onClose, articulo, onBloqueosChanged }) => {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoInicio, setNuevoInicio] = useState('')
  const [nuevoFin, setNuevoFin] = useState('')
  const [nuevoMotivo, setNuevoMotivo] = useState('')

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([getReservasPorArticulo(articulo.id), getBloqueos(articulo.id)])
      setReservas(r)
      setBloqueos(b)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del artículo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo.id])

  if (!isOpen) return null

  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (nuevoInicio >= nuevoFin) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin.')
      return
    }

    try {
      const conflicto = await hayConflictoDisponibilidad(articulo.id, nuevoInicio, nuevoFin)
      if (conflicto) {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
        return
      }

      await createBloqueo({
        articulo_id: articulo.id,
        fecha_inicio: nuevoInicio,
        fecha_fin: nuevoFin,
        motivo: nuevoMotivo,
      })
      setNuevoInicio('')
      setNuevoFin('')
      setNuevoMotivo('')
      await cargarDatos()
      onBloqueosChanged()
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23P01') {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear el bloqueo.')
      }
    }
  }

  const handleBackdropClick = () => {
    const sucio = nuevoInicio.trim() !== '' || nuevoFin.trim() !== '' || nuevoMotivo.trim() !== ''
    if (sucio && !window.confirm('¿Descartar los cambios?')) return
    onClose()
  }

  const handleEliminarBloqueo = async (id: string) => {
    setError(null)
    try {
      await deleteBloqueo(id)
      await cargarDatos()
      onBloqueosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el bloqueo.')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {articulo.imagen_url && (
          <img
            src={articulo.imagen_url}
            alt={articulo.nombre}
            className="w-full h-48 object-cover rounded-none mb-4"
          />
        )}
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold text-gray-900">{articulo.nombre}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {articulo.categoria} · {articulo.estado}
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : (
          <>
            <h3 className="font-heading font-semibold text-gray-900 mb-2 uppercase text-sm tracking-wide">Historial de reservas</h3>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reservas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-gray-500">
                        Sin reservas.
                      </td>
                    </tr>
                  ) : (
                    reservas.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">{r.cliente_nombre}</td>
                        <td className="px-3 py-2">
                          {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                        </td>
                        <td className="px-3 py-2 capitalize">{r.estado}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="font-heading font-semibold text-gray-900 mb-2 uppercase text-sm tracking-wide">Bloqueos</h3>
            <ul className="mb-4 divide-y divide-gray-200 border rounded-lg">
              {bloqueos.length === 0 ? (
                <li className="px-3 py-2 text-gray-500 text-sm">Sin bloqueos.</li>
              ) : (
                bloqueos.map((b) => (
                  <li key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      {formatFecha(b.fecha_inicio)} → {formatFecha(b.fecha_fin)} · {b.motivo}
                    </span>
                    <button
                      onClick={() => handleEliminarBloqueo(b.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-none hover:bg-red-700 transition text-sm self-start sm:self-auto"
                    >
                      Eliminar
                    </button>
                  </li>
                ))
              )}
            </ul>

            <form onSubmit={handleCrearBloqueo} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <div>
                <label htmlFor="nuevoInicio" className="block text-xs text-gray-600">Desde:</label>
                <input
                  type="date"
                  id="nuevoInicio"
                  value={nuevoInicio}
                  onChange={(e) => setNuevoInicio(e.target.value)}
                  required
                  className="w-full px-2 py-1 border rounded-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="nuevoFin" className="block text-xs text-gray-600">Hasta:</label>
                <input
                  type="date"
                  id="nuevoFin"
                  value={nuevoFin}
                  onChange={(e) => setNuevoFin(e.target.value)}
                  required
                  className="w-full px-2 py-1 border rounded-none text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="nuevoMotivo" className="block text-xs text-gray-600">Motivo:</label>
                <input
                  type="text"
                  id="nuevoMotivo"
                  value={nuevoMotivo}
                  onChange={(e) => setNuevoMotivo(e.target.value)}
                  required
                  className="w-full px-2 py-1 border rounded-none text-sm"
                />
              </div>
              <button
                type="submit"
                className="sm:col-span-2 bg-primary text-white px-4 py-2 rounded-none hover:bg-primary/90 transition"
              >
                Añadir Bloqueo
              </button>
            </form>
          </>
        )}

        <button
          onClick={onClose}
          className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ArticleDetailModal
