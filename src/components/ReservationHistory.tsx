import React, { useEffect, useState } from 'react';
import { useSupabase } from '../lib/supabase';

const ReservationHistory: React.FC = () => {
  const { supabase } = useSupabase();
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    async function fetchReservas() {
      try {
        const { data, error } = await supabase
          .from('reservas')
          .select('*')
          .innerJoin('articulos', 'articulo_id', 'id');
        if (!error) {
          setReservas(data);
        }
      } catch (error) {
        console.error('Error fetching reservations:', error);
      }
    }

    fetchReservas();
  }, [supabase]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cliente
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teléfono
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Artículo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Inicio
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Fin
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {reservas.map((reserva) => (
            <tr key={reserva.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reserva.cliente}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.telefono}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.articulo.nombre}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.fecha_inicio}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.fecha_fin}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {reserva.estado === 'pendiente' && (
                  <span className="bg-yellow-100 px-2 py-1 rounded">Pendiente</span>
                )}
                {reserva.estado === 'confirmada' && (
                  <span className="bg-green-100 px-2 py-1 rounded">Confirmada</span>
                )}
                {reserva.estado === 'cancelada' && (
                  <span className="bg-red-100 px-2 py-1 rounded">Cancelada</span>
                )}
                {reserva.estado === 'completada' && (
                  <span className="bg-blue-100 px-2 py-1 rounded">Completada</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReservationHistory;
