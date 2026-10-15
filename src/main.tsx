import React from 'react'
import ReactDOM from 'react-dom/client'
import Modal from 'react-modal'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App'
import ClerkSupabaseBridge from './lib/ClerkSupabaseBridge'
import ErrorBoundary from './components/ErrorBoundary'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const root = ReactDOM.createRoot(document.getElementById('root')!)
Modal.setAppElement('#root')

if (!clerkPubKey) {
  root.render(
    <React.StrictMode>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white border-2 border-gray-900 p-6 max-w-md text-center">
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Falta configuración</h1>
          <p className="text-gray-600">
            No se encontró <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Revisa tu archivo <code>.env.local</code>.
          </p>
        </div>
      </div>
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <ClerkSupabaseBridge />
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}
