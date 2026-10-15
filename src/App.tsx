import React, { useState } from 'react'
import { useAuth, SignedIn, SignInButton, UserButton } from '@clerk/clerk-react'
import type { Articulo } from './types'

const Calendar = React.lazy(() => import('./components/Calendar'))
const MonthCalendarView = React.lazy(() => import('./components/MonthCalendarView'))
const ManageArticleModal = React.lazy(() => import('./components/ManageArticleModal'))
const ArticleDetailModal = React.lazy(() => import('./components/ArticleDetailModal'))
const ReserveModal = React.lazy(() => import('./components/ReserveModal'))
const ReservationHistory = React.lazy(() => import('./components/ReservationHistory'))
const GestionarReservasModal = React.lazy(() => import('./components/GestionarReservasModal'))

type Vista = 'dashboard' | 'calendario' | 'historial'

function App() {
  const { isSignedIn, isLoaded } = useAuth()
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

  const handleArticuloClick = (articulo: Articulo) => {
    setDetalleArticulo(articulo)
  }

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1)

  const navButtons: { label: string; onClick: () => void; className: string }[] = [
    { label: '🏠 Dashboard', onClick: () => setVista('dashboard'), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📆 Calendario', onClick: () => setVista('calendario'), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📅 Nueva Reserva', onClick: handleNuevaReservaClick, className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📝 Gestionar Reservas', onClick: () => setModalGestionarOpen(true), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '📋 Historial', onClick: () => setVista((prev) => (prev === 'historial' ? 'dashboard' : 'historial')), className: 'border border-white/30 text-white hover:bg-white/10' },
    { label: '⚙️ Gestionar Artículos', onClick: () => setModalArticuloOpen(true), className: 'border border-white/30 text-white hover:bg-white/10' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-900 border-b-4 border-primary p-4 flex justify-between items-center flex-wrap gap-2">
        <h1 className="font-heading text-2xl font-bold text-white">
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => setVista('dashboard')}
          >
            🗄️ SaltarAdmin
          </button>
        </h1>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              <div className="hidden md:flex flex-wrap gap-2 items-center">
                {navButtons.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`${btn.className} px-5 py-2.5 text-lg rounded-none transition`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="md:hidden bg-white text-gray-800 px-4 py-2.5 text-lg rounded-none hover:bg-gray-100 transition"
                aria-label="Menú"
              >
                ☰
              </button>
              <UserButton />
            </>
          ) : isLoaded ? (
            <SignInButton mode="modal">
              <button className="bg-white text-gray-800 px-5 py-2.5 text-lg rounded-none hover:bg-gray-100 transition">
                Sign in
              </button>
            </SignInButton>
          ) : (
            <div className="h-10 w-24" />
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
                className={`${btn.className} px-5 py-2.5 text-lg rounded-none transition w-full text-left`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </nav>
      <main className="p-6">
        <SignedIn>
          <React.Suspense fallback={<p className="text-gray-500 text-sm">Cargando...</p>}>
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-none flex justify-between items-center">
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
          </React.Suspense>
        </SignedIn>
      </main>

      {modalArticuloOpen && (
        <React.Suspense fallback={null}>
          <ManageArticleModal
            isOpen={modalArticuloOpen}
            onClose={() => setModalArticuloOpen(false)}
            onArticulosChanged={handleDataChanged}
          />
        </React.Suspense>
      )}

      {modalGestionarOpen && (
        <React.Suspense fallback={null}>
          <GestionarReservasModal
            isOpen={modalGestionarOpen}
            onClose={() => setModalGestionarOpen(false)}
            onReservasChanged={handleDataChanged}
          />
        </React.Suspense>
      )}

      {modalReservaOpen && (
        <React.Suspense fallback={null}>
          <ReserveModal
            isOpen={modalReservaOpen}
            onClose={() => setModalReservaOpen(false)}
            articuloId={selectedArticuloId || undefined}
            articuloNombre={selectedArticuloNombre || undefined}
            fechaInicio={selectedStart || undefined}
            fechaFin={selectedEnd || undefined}
            onReservaCreada={handleDataChanged}
          />
        </React.Suspense>
      )}

      {detalleArticulo && (
        <React.Suspense fallback={null}>
          <ArticleDetailModal
            isOpen={!!detalleArticulo}
            onClose={() => setDetalleArticulo(null)}
            articulo={detalleArticulo}
            onBloqueosChanged={handleDataChanged}
          />
        </React.Suspense>
      )}
    </div>
  )
}

export default App
