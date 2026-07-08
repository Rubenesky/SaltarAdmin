import React, { useEffect, useState } from 'react'
import { createArticulo, deleteArticulo, getArticulos, updateArticuloEstado } from '../lib/supabase'
import type { Articulo, ArticuloEstado } from '../types'

interface ManageArticleModalProps {
  isOpen: boolean
  onClose: () => void
  onArticulosChanged: () => void
}

const CATEGORIAS = [
  'colchón viscoelástico',
  'colchón muelles',
  'colchón látex',
  'toro mecánico',
  'fiesta espuma',
  'otro',
]

const ESTADOS: ArticuloEstado[] = ['disponible', 'mantenimiento', 'baja']

const ManageArticleModal: React.FC<ManageArticleModalProps> = ({ isOpen, onClose, onArticulosChanged }) => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[0])
  const [estado, setEstado] = useState<ArticuloEstado>('disponible')
  const [error, setError] = useState<string | null>(null)

  const cargarArticulos = async () => {
    setLoading(true)
    try {
      const data = await getArticulos()
      setArticulos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) cargarArticulos()
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createArticulo({ nombre, categoria, estado })
      setNombre('')
      setCategoria(CATEGORIAS[0])
      setEstado('disponible')
      setShowForm(false)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el artículo.')
    }
  }

  const handleEstadoChange = async (id: string, nuevoEstado: ArticuloEstado) => {
    setError(null)
    try {
      await updateArticuloEstado(id, nuevoEstado)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    }
  }

  const handleEliminarArticulo = async (id: string, nombre: string) => {
    const confirmado = window.confirm(
      `¿Seguro que quieres eliminar "${nombre}" permanentemente? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    setError(null)
    try {
      await deleteArticulo(id)
      await cargarArticulos()
      onArticulosChanged()
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23503') {
        setError(
          'No se puede eliminar: este artículo tiene reservas o bloqueos asociados. Cámbialo a estado "baja" en su lugar, o elimina primero sus reservas/bloqueos.'
        )
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el artículo.')
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">⚙️ Gestionar Artículos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm mb-4">Cargando...</p>
        ) : (
          <ul className="mb-4 divide-y divide-gray-200 border rounded-lg">
            {articulos.length === 0 ? (
              <li className="px-3 py-2 text-gray-500 text-sm">Sin artículos todavía.</li>
            ) : (
              articulos.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-medium text-gray-800">{a.nombre}</p>
                    <p className="text-xs text-gray-500">{a.categoria}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={a.estado}
                      onChange={(e) => handleEstadoChange(a.id, e.target.value as ArticuloEstado)}
                      className="text-sm border rounded-lg px-2 py-1"
                    >
                      {ESTADOS.map((estadoOption) => (
                        <option key={estadoOption} value={estadoOption}>
                          {estadoOption}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleEliminarArticulo(a.id, a.nombre)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}

        {showForm ? (
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
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="estado" className="block text-gray-700">Estado:</label>
              <select
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as ArticuloEstado)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              >
                {ESTADOS.map((estadoOption) => (
                  <option key={estadoOption} value={estadoOption}>
                    {estadoOption}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition ml-2"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            ➕ Nuevo Artículo
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition w-full"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ManageArticleModal
