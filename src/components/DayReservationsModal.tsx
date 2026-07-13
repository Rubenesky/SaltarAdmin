import React from 'react'
import { formatFecha } from '../lib/format'
import type { ReservaConArticulo } from '../types'

interface DayReservationsModalProps {
  isOpen: boolean
  onClose: () => void
  fecha: string
  reservas: ReservaConArticulo[]
}

const DayReservationsModal: React.FC<DayReservationsModalProps> = ({ isOpen, onClose, fecha, reservas }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📅 {formatFecha(fecha)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {reservas.length === 0 ? (
          <p className="text-gray-500 text-sm mb-4">No hay reservas este día.</p>
        ) : (
          <ul className="mb-4 divide-y divide-gray-200 border rounded-lg">
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
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default DayReservationsModal
