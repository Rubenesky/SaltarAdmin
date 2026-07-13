import React, { useEffect, useState } from 'react'
import { createReserva, getArticulosDisponibles, hayConflictoReserva } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import type { Articulo } from '../types'

interface ReserveModalProps {
  isOpen: boolean
  onClose: () => void
  onReservaCreada: () => void
  articuloId?: string
  articuloNombre?: string
  fechaInicio?: string
  fechaFin?: string
}

const ReserveModal: React.FC<ReserveModalProps> = ({
  isOpen,
  onClose,
  onReservaCreada,
  articuloId,
  articuloNombre,
  fechaInicio,
  fechaFin,
}) => {
  const contextoFijo = Boolean(articuloId && fechaInicio && fechaFin)

  const [articulosDisponibles, setArticulosDisponibles] = useState<Articulo[]>([])
  const [formArticuloId, setFormArticuloId] = useState('')
  const [formFechaInicio, setFormFechaInicio] = useState('')
  const [formFechaFin, setFormFechaFin] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && !contextoFijo) {
      getArticulosDisponibles()
        .then((data) => {
          setArticulosDisponibles(data)
          setFormArticuloId(data[0]?.id ?? '')
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.'))
    }
  }, [isOpen, contextoFijo])

  if (!isOpen) return null

  const handleBackdropClick = () => {
    const sucio = clienteNombre.trim() !== '' || clienteTelefono.trim() !== '' || clienteEmail.trim() !== '' || notas.trim() !== ''
    if (sucio && !window.confirm('¿Descartar los cambios?')) return
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const finalArticuloId = contextoFijo ? articuloId! : formArticuloId
    const finalFechaInicio = contextoFijo ? fechaInicio! : formFechaInicio
    const finalFechaFin = contextoFijo ? fechaFin! : formFechaFin

    if (!finalArticuloId || !finalFechaInicio || !finalFechaFin) {
      setError('Selecciona artículo y fechas.')
      return
    }

    if (finalFechaInicio > finalFechaFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.')
      return
    }

    setSaving(true)
    try {
      if (!contextoFijo) {
        const conflicto = await hayConflictoReserva(finalArticuloId, finalFechaInicio, finalFechaFin)
        if (conflicto) {
          setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
          return
        }
      }

      await createReserva({
        articulo_id: finalArticuloId,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        cliente_email: clienteEmail || null,
        fecha_inicio: finalFechaInicio,
        fecha_fin: finalFechaFin,
        notas: notas || null,
      })
      onReservaCreada()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold mb-1 text-gray-800">📝 Crear Reserva</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {contextoFijo && (
          <p className="text-sm text-gray-500 mb-4">
            {articuloNombre} · {formatFecha(fechaInicio!)} → {formatFecha(fechaFin!)}
          </p>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        <form onSubmit={handleSubmit}>
          {!contextoFijo && (
            <>
              <div className="mb-4">
                <label htmlFor="formArticuloId" className="block text-gray-700">Artículo:</label>
                <select
                  id="formArticuloId"
                  value={formArticuloId}
                  onChange={(e) => setFormArticuloId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {articulosDisponibles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="formFechaInicio" className="block text-gray-700">Desde:</label>
                  <input
                    type="date"
                    id="formFechaInicio"
                    value={formFechaInicio}
                    onChange={(e) => setFormFechaInicio(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="formFechaFin" className="block text-gray-700">Hasta:</label>
                  <input
                    type="date"
                    id="formFechaFin"
                    value={formFechaFin}
                    onChange={(e) => setFormFechaFin(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="mb-4">
            <label htmlFor="clienteNombre" className="block text-gray-700">Nombre del Cliente:</label>
            <input
              type="text"
              id="clienteNombre"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="clienteTelefono" className="block text-gray-700">Teléfono:</label>
            <input
              type="text"
              id="clienteTelefono"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="clienteEmail" className="block text-gray-700">Email (opcional):</label>
            <input
              type="email"
              id="clienteEmail"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="notas" className="block text-gray-700">Notas (opcional):</label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            ✅ Crear Reserva
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition ml-2"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}

export default ReserveModal
