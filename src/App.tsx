import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react'
import Calendar from './components/Calendar'

function App() {
  const { isSignedIn } = useAuth()

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-8">SaltarAdmin</h1>
          <SignInButton mode="modal">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition">
              Iniciar sesión con Google
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">🗄️ SaltarAdmin</h1>
        <UserButton />
      </nav>
      <main className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">📦 Gestión de stock</h2>
        <Calendar />
      </main>
    </div>
  )
}

export default App