import React, { useState } from 'react';
import { useSupabase } from '../lib/supabase';

interface ManageArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticuloCreado: (articulo: any) => void;
}

const ManageArticleModal: React.FC<ManageArticleModalProps> = ({ isOpen, onClose, onArticuloCreado }) => {
  const { supabase } = useSupabase();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('colchon viscoelastico');
  const [estado, setEstado] = useState('disponible');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('articulos')
        .insert([{ nombre, categoria, estado }]);
      if (!error) {
        onArticuloCreado(data[0]);
        onClose();
      }
    } catch (error) {
      console.error('Error creating article:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Crear Artículo</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="nombre" className="block text-gray-700">Nombre:</label>
            <input
              type="text"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="categoria" className="block text-gray-700">Categoría:</label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="colchon viscoelastico">Colchón Viscoelástico</option>
              <option value="colchon muelles">Colchón Muelles</option>
              <option value="colchon latex">Colchón Latex</option>
              <option value="toro mecanico">Toro Mecánico</option>
              <option value="fiesta espuma">Fiesta Espuma</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="estado" className="block text-gray-700">Estado:</label>
            <select
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="disponible">Disponible</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            Crear
          </button>
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition ml-2">
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManageArticleModal;
