import React, { useState } from 'react'
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react'
import Calendar from './components/Calendar'
import ManageArticleModal from './components/ManageArticleModal'
import ArticleDetailModal from './components/ArticleDetailModal'
import ReserveModal from './components/ReserveModal'
import ReservationHistory from './components/ReservationHistory'
import { getArticulos } from './lib/supabase'
import type { Articulo } from './types'

function App() {
  const { isSignedIn } = useAuth()
  const [showHistorial, setShowHistorial] = useState(false)
  const [modalReservaOpen, setModalReservaOpen] = useState(false)
  const [modalArticuloOpen, setModalArticuloOpen] = useState(false)
  const [detalleArticulo, setDetalleArticulo] = useState<Articulo | null>(null)
  const [selectedArticuloId, setSelectedArticuloId] = useState('')
  const [selectedArticuloNombre, setSelectedArticuloNombre] = useState('')
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCeldaClick = (articuloId: string, articuloNombre: string, start: string, end: string) => {
    setSelectedArticuloId(articuloId)
    setSelectedArticuloNombre(articuloNombre)
    setSelectedStart(start)
    setSelectedEnd(end)
    setModalReservaOpen(true)
  }

  const handleNuevaReservaClick = () => {
    setShowHistorial(false)
    setSelectedArticuloId('')
    setSelectedArticuloNombre('')
    setSelectedStart('')
    setSelectedEnd('')
    setModalReservaOpen(true)
  }

  const handleArticuloClick = async (articuloId: string) => {
    const articulos = await getArticulos()
    const articulo = articulos.find((a) => a.id === articuloId)
    if (articulo) setDetalleArticulo(articulo)
  }

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1)

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">🗄️ SaltarAdmin</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isSignedIn ? (
            <>
              <button
                onClick={handleNuevaReservaClick}
                className="bg-green-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-green-700 transition"
              >
                📅 Nueva Reserva
              </button>
              <button
                onClick={() => setShowHistorial((prev) => !prev)}
                className="bg-blue-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-blue-700 transition"
              >
                📋 Historial
              </button>
              <button
                onClick={() => setModalArticuloOpen(true)}
                className="bg-gray-600 text-white px-5 py-2.5 text-lg rounded-lg hover:bg-gray-700 transition"
              >
                ⚙️ Gestionar Artículos
              </button>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal" />
          )}
        </div>
      </nav>
      <main className="p-6">
        {showHistorial ? (
          <ReservationHistory key={`historial-${refreshKey}`} />
        ) : (
          <Calendar
            key={`calendario-${refreshKey}`}
            onCeldaClick={handleCeldaClick}
            onArticuloClick={handleArticuloClick}
          />
        )}
      </main>

      {modalArticuloOpen && (
        <ManageArticleModal
          isOpen={modalArticuloOpen}
          onClose={() => setModalArticuloOpen(false)}
          onArticulosChanged={handleDataChanged}
        />
      )}

      {modalReservaOpen && (
        <ReserveModal
          isOpen={modalReservaOpen}
          onClose={() => setModalReservaOpen(false)}
          articuloId={selectedArticuloId || undefined}
          articuloNombre={selectedArticuloNombre || undefined}
          fechaInicio={selectedStart || undefined}
          fechaFin={selectedEnd || undefined}
          onReservaCreada={handleDataChanged}
        />
      )}

      {detalleArticulo && (
        <ArticleDetailModal
          isOpen={!!detalleArticulo}
          onClose={() => setDetalleArticulo(null)}
          articulo={detalleArticulo}
          onBloqueosChanged={handleDataChanged}
        />
      )}
    </div>
  )
}

export default App
