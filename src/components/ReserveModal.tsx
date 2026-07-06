import React, { useState } from 'react'
import Modal from 'react-modal'
import { supabase } from '../lib/supabase'

// Para que funcione correctamente con React
Modal.setAppElement('#root')

interface ReserveModalProps {
  isOpen: boolean
  onClose: () => void
  articuloId: string
  fechaInicio: string
  fechaFin: string
  onReservaCreada: () => void
}

const ReserveModal: React.FC<ReserveModalProps> = ({
  isOpen,
  onClose,
  articuloId,
  fechaInicio,
  fechaFin,
  onReservaCreada
}) => {
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('reservas').insert([
        {
          articulo_id: articuloId,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          cliente_email: clienteEmail || null,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado: 'pendiente',
          notas: notas || null
        }
      ])

      if (error) throw error

      // Limpiar formulario
      setClienteNombre('')
      setClienteTelefono('')
      setClienteEmail('')
      setNotas('')
      onReservaCreada()
      onClose()
    } catch (error) {
      console.error('Error creando reserva:', error)
      alert('Error al crear la reserva. Revisa la consola.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Crear Reserva"
      className="max-w-md mx-auto mt-20 bg-white rounded-lg shadow-xl p-6"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Crear Reserva</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del cliente *
          </label>
          <input
            type="text"
            required
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono *
          </label>
          <input
            type="tel"
            required
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: 612345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email (opcional)
          </label>
          <input
            type="email"
            value={clienteEmail}
            onChange={(e) => setClienteEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: cliente@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Indicaciones especiales..."
          />
        </div>

        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p><strong>Artículo:</strong> ID: {articuloId}</p>
          <p><strong>Desde:</strong> {fechaInicio}</p>
          <p><strong>Hasta:</strong> {fechaFin}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : '✅ Crear Reserva'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ReserveModal