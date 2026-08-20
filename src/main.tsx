import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/archivo'
import './styles/globals.css'
import { applyTheme } from './theme'
import App from './App.tsx'

// index.html sets data-theme pre-paint; re-applying here covers any embed
// context that serves the SPA without that inline script.
applyTheme()

// Installability only (see public/sw.js) — prod-only so dev never fights a
// registered worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
