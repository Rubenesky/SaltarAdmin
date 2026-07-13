import React, { useState } from 'react'
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react'
import Calendar from './components/Calendar'
import MonthCalendarView from './components/MonthCalendarView'
import ManageArticleModal from './components/ManageArticleModal'
import ArticleDetailModal from './components/ArticleDetailModal'
import ReserveModal from './components/ReserveModal'
import ReservationHistory from './components/ReservationHistory'
import GestionarReservasModal from './components/GestionarReservasModal'
import { getArticulos } from './lib/supabase'
import type { Articulo } from './types'

type Vista = 'dashboard' | 'calendario' | 'historial'

function App() {
  const { isSignedIn } = useAuth()
  const [vista, setVista] = useState<Vista>('dashboard')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [modalReservaOpen, setModalReservaOpen] = useState(false)
  const [modalArticuloOpen, setModalArticuloOpen] = useState(false)
  const [modalGestionarOpen, setModalGestionarOpen] = useState(false)
  const [detalleArticulo, setDetalleArticulo] = useState<Articulo | null>(null)
  const [selectedArticuloId, setSelectedArticuloId] = useState('')
  const [selectedArticuloNombre, setSelectedArticuloNombre] = useState('')
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')

  const handleCeldaClick = (articuloId: string, articuloNombre: string, start: string, end: string) => {
    setSelectedArticuloId(articuloId)
    setSelectedArticuloNombre(articuloNombre)
    setSelectedStart(start)
    setSelectedEnd(end)
    setModalReservaOpen(true)
  }

  const handleNuevaReservaClick = () => {
    setVista('dashboard')
    setSelectedArticuloId('')
    setSelectedArticuloNombre('')
    setSelectedStart('')
    setSelectedEnd('')
    setModalReservaOpen(true)
  }

  const handleArticuloClick = async (articuloId: string) => {
    try {
      const articulos = await getArticulos()
      const articulo = articulos.find((a) => a.id === articuloId)
      if (articulo) setDetalleArticulo(articulo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los detalles del artículo'
      setError(message)
    }
  }

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1)

  const navButtons: { label: string; onClick: () => void; className: string }[] = [
    { label: '🏠 Dashboard', onClick: () => setVista('dashboard'), className: 'bg-white text-gray-800 hover:bg-gray-100' },
    { label: '📆 Calendario', onClick: () => setVista('calendario'), className: 'bg-teal-600 text-white hover:bg-teal-700' },
    { label: '📅 Nueva Reserva', onClick: handleNuevaReservaClick, className: 'bg-green-600 text-white hover:bg-green-700' },
    { label: '📝 Gestionar Reservas', onClick: () => setModalGestionarOpen(true), className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
    { label: '📋 Historial', onClick: () => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial')), className: 'bg-blue-600 text-white hover:bg-blue-700' },
    { label: '⚙️ Gestionar Artículos', onClick: () => setModalArticuloOpen(true), className: 'bg-gray-600 text-white hover:bg-gray-700' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center flex-wrap gap-2">
        <h1
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => setVista('dashboard')}
        >
          🗄️ SaltarAdmin
        </h1>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              <div className="hidden md:flex flex-wrap gap-2 items-center">
                {navButtons.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`${btn.className} px-5 py-2.5 text-lg rounded-lg transition`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="md:hidden bg-white text-gray-800 px-4 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition"
                aria-label="Menú"
              >
                ☰
              </button>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-lg hover:bg-gray-100 transition">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
        {isSignedIn && menuAbierto && (
          <div className="md:hidden w-full flex flex-col gap-2">
            {navButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => {
                  btn.onClick()
                  setMenuAbierto(false)
                }}
                className={`${btn.className} px-5 py-2.5 text-lg rounded-lg transition w-full text-left`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </nav>
      <main className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-700 hover:text-red-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}
        {vista === 'historial' ? (
          <ReservationHistory key={`historial-${refreshKey}`} />
        ) : vista === 'calendario' ? (
          <MonthCalendarView key={`mes-${refreshKey}`} />
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

      {modalGestionarOpen && (
        <GestionarReservasModal
          isOpen={modalGestionarOpen}
          onClose={() => setModalGestionarOpen(false)}
          onReservasChanged={handleDataChanged}
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
