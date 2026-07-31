import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initGA } from './lib/analytics'

// Initialize Google Analytics 4
initGA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
