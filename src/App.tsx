import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import SignInButton from './components/SignInButton';
import UserButton from './components/UserButton';
import { getArticles, getReservations, createReservation, createArticle } from './lib/supabase';

function App() {
  const { isSignedIn, user } = useAuth();

  useEffect(() => {
    console.log('User:', user);
  }, [user]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      {!isSignedIn ? (
        <SignInButton />
      ) : (
        <>
          <UserButton />
          {/* Resto del contenido de la app */}
        </>
      )}
    </div>
  );
}

export default App;
