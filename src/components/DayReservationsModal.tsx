import React from 'react'
import Modal from 'react-modal'
import { formatFecha } from '../lib/format'
import type { ReservaConArticulo } from '../types'

interface DayReservationsModalProps {
  isOpen: boolean
  onClose: () => void
  fecha: string
  reservas: ReservaConArticulo[]
}

const DayReservationsModal: React.FC<DayReservationsModalProps> = ({ isOpen, onClose, fecha, reservas }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto outline-none"
    >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-gray-900">📅 {formatFecha(fecha)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {reservas.length === 0 ? (
          <p className="text-gray-500 text-sm mb-4">No hay reservas este día.</p>
        ) : (
          <ul className="mb-4 divide-y divide-gray-200 border rounded-none">
            {reservas.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <p className="font-medium text-gray-800">
                  {r.cliente_nombre} · {r.articulos?.nombre ?? '—'}
                </p>
                <p className="text-gray-500">📞 {r.cliente_telefono}</p>
                {r.cliente_email && <p className="text-gray-500">✉️ {r.cliente_email}</p>}
                <p className="text-gray-500">
                  📅 {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                </p>
                <p className="text-gray-500 capitalize">Estado: {r.estado}</p>
                {r.notas && <p className="text-gray-500">📝 {r.notas}</p>}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
    </Modal>
  )
}

export default DayReservationsModal
