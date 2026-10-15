import React from 'react'
import Modal from 'react-modal'

interface PrivacyNoticeModalProps {
  isOpen: boolean
  onClose: () => void
}

const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      className="bg-white p-4 sm:p-6 rounded-none border-2 border-gray-900 max-w-lg w-full max-h-[85vh] overflow-y-auto outline-none"
    >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-gray-900">🔒 Política de Privacidad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="text-sm text-gray-700 space-y-3">
          <p>
            Al hacer una reserva en Saltarines, recogemos tu nombre, teléfono, y opcionalmente tu
            email y notas sobre el alquiler. Usamos estos datos únicamente para gestionar la reserva y
            contactarte para la entrega y devolución del artículo alquilado.
          </p>
          <p>
            La base legal para tratar estos datos es la ejecución del contrato de alquiler entre tú y
            Saltarines.
          </p>
          <p>
            Conservamos tus datos mientras sean necesarios para gestionar el alquiler, y los eliminamos
            cuando dejan de serlo (orientativamente, unos 12 meses desde la fecha de fin del alquiler),
            salvo que la ley nos obligue a conservarlos más tiempo.
          </p>
          <p>
            Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos, o borrarlos por completo,
            llamando o escribiendo al 685 79 36 16. Si has hecho varias reservas con nosotros, dinos todas las que
            recuerdes para que podamos localizar y borrar cada una — nuestro sistema guarda los datos de
            contacto por reserva, no en una ficha única de cliente.
          </p>
          <p>
            No incluyas datos de salud u otra información sensible en el campo de notas de tu reserva.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 border border-gray-900 text-gray-900 bg-transparent px-4 py-2 rounded-none hover:bg-gray-100 transition w-full"
        >
          Cerrar
        </button>
    </Modal>
  )
}

export default PrivacyNoticeModal
