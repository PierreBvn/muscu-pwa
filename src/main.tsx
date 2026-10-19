import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ensureSeeded } from './db/exercises';

// Initialisation idempotente des exercices par défaut au démarrage
await ensureSeeded().catch((err) => {
  console.error('Erreur lors du seed initial des exercices :', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
