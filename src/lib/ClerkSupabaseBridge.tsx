import { useEffect } from 'react'
import { useSession } from '@clerk/clerk-react'
import { setClerkTokenGetter } from './supabase'

// Mantiene el cliente de Supabase enlazado a la sesión de Clerk actual.
// useSession() garantiza que solo se llame una vez que Clerk haya resuelto
// la sesión (o su ausencia), evitando el problema de carrera de leer
// window.Clerk directamente antes de que esté poblado.
const ClerkSupabaseBridge: React.FC = () => {
  const { session } = useSession()

  useEffect(() => {
    setClerkTokenGetter(session ? () => session.getToken() : null)
    return () => setClerkTokenGetter(null)
  }, [session])

  return null
}

export default ClerkSupabaseBridge
