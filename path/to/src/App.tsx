import React, { useState } from 'react';
import Calendar from './components/Calendar';
import ManageArticleModal from './components/ManageArticleModal';
import ReservationHistory from './components/ReservationHistory';
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react';

function App() {
  const { isSignedIn } = useAuth();
  const [showHistorial, setShowHistorial] = useState(false);
  const [modalReservaOpen, setModalReservaOpen] = useState(false);
  const [modalArticuloOpen, setModalArticuloOpen] = useState(false);
  const [selectedArticulo, setSelectedArticulo] = useState(null);
  const [selectedStart, setSelectedStart] = useState('');
  const [selectedEnd, setSelectedEnd] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCeldaClick = (articuloId: number, start: string, end: string) => {
    setSelectedArticulo(articuloId);
    setSelectedStart(start);
    setSelectedEnd(end);
    setModalReservaOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-700 to-orange-500 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">🗄️ SaltarAdmin</h1>
        <div className="flex space-x-4">
          {isSignedIn ? (
            <>
              <button onClick={() => setModalReservaOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Nueva Reserva</button>
              <button onClick={() => setShowHistorial(!showHistorial)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                Historial
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
          <ReservationHistory />
        ) : (
          <Calendar onCeldaClick={handleCeldaClick} key={refreshKey} />
        )}
      </main>

      {modalArticuloOpen && (
        <ManageArticleModal
          isOpen={modalArticuloOpen}
          onClose={() => setModalArticuloOpen(false)}
          onArticuloCreado={(articulo) => {
            // Handle article created
          }}
        />
      )}

      {modalReservaOpen && selectedArticulo && (
        <ReserveModal
          isOpen={modalReservaOpen}
          onClose={() => setModalReservaOpen(false)}
          articuloId={selectedArticulo}
          fechaInicio={selectedStart}
          fechaFin={selectedEnd}
          onReservaCreada={(reserva) => {
            // Handle reservation created
            setRefreshKey(prevKey => prevKey + 1);
          }}
        />
      )}
    </div>
  );
}

export default App;
