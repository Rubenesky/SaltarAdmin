import React, { useState } from 'react';
import { useSupabase } from '../lib/supabase';

interface ReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  articuloId: number;
  fechaInicio: string;
  fechaFin: string;
  onReservaCreada: (reserva: any) => void;
}

const ReserveModal: React.FC<ReserveModalProps> = ({ isOpen, onClose, articuloId, fechaInicio, fechaFin, onReservaCreada }) => {
  const { supabase } = useSupabase();
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('reservas')
        .insert([{ cliente: nombreCliente, telefono, email, notas, articulo_id: articuloId, fecha_inicio: fechaInicio, fecha_fin: fechaFin, estado: 'pendiente' }]);
      if (!error) {
        onReservaCreada(data[0]);
        onClose();
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Crear Reserva</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="nombreCliente" className="block text-gray-700">Nombre del Cliente:</label>
            <input
              type="text"
              id="nombreCliente"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="telefono" className="block text-gray-700">Teléfono:</label>
            <input
              type="text"
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700">Email (opcional):</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            Reservar
          </button>
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition ml-2">
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReserveModal;
