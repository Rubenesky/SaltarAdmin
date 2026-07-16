import React, { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { createReserva, getArticulosDisponibles, hayConflictoDisponibilidad } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import PrivacyNoticeModal from './PrivacyNoticeModal'
import type { Articulo } from '../types'
import { getErrorMessage } from '../lib/errors'

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
  const [modalPrivacidadOpen, setModalPrivacidadOpen] = useState(false)

  useEffect(() => {
    if (isOpen && !contextoFijo) {
      getArticulosDisponibles()
        .then((data) => {
          setArticulosDisponibles(data)
          setFormArticuloId(data[0]?.id ?? '')
        })
        .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los artículos.')))
    }
  }, [isOpen, contextoFijo])

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

    if (finalFechaInicio >= finalFechaFin) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin.')
      return
    }

    setSaving(true)
    try {
      const conflicto = await hayConflictoDisponibilidad(finalArticuloId, finalFechaInicio, finalFechaFin)
      if (conflicto) {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
        return
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
      const code = (err as { code?: string })?.code
      if (code === '23P01') {
        setError('Ese artículo no está disponible en esas fechas (ya reservado o bloqueado).')
      } else {
        setError(getErrorMessage(err, 'No se pudo crear la reserva.'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={handleBackdropClick}
        ariaHideApp={false}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-md w-full max-h-[85vh] overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold mb-1 text-gray-900">📝 Crear Reserva</h2>
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
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-none p-2">{error}</p>
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
                  className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
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
                    className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
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
                    className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
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
              className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
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
              className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="clienteEmail" className="block text-gray-700">Email (opcional):</label>
            <input
              type="email"
              id="clienteEmail"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="notas" className="block text-gray-700">Notas (opcional):</label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded-none focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              No incluyas datos de salud u otra información sensible.
            </p>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Al crear la reserva, tratamos estos datos según nuestra{' '}
            <button
              type="button"
              onClick={() => setModalPrivacidadOpen(true)}
              className="text-primary underline hover:text-primary/80"
            >
              política de privacidad
            </button>
            .
          </p>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-none hover:bg-primary/90 transition disabled:opacity-50"
          >
            ✅ Crear Reserva
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition ml-2"
          >
            Cancelar
          </button>
        </form>
      </Modal>
    <PrivacyNoticeModal isOpen={modalPrivacidadOpen} onClose={() => setModalPrivacidadOpen(false)} />
    </>
  )
}

export default ReserveModal
