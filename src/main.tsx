import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

const clerk = new Clerk('YOUR_CLERK_PUBLIC_KEY');

ReactDOM.createRoot(document.getElementById('root')).render(
  <ClerkProvider client={clerk}>
    <App />
  </ClerkProvider>
);
