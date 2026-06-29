import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '../index.css'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

;(function aplicarTemaInicial() {
  const modo = localStorage.getItem('theme_modo') || 'auto'
  let resolved = modo
  if (resolved === 'auto') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
  }
  const base = resolved === 'oscuro' ? 'theme-oscuro' : ''
  const accent = localStorage.getItem('theme_accent') || ''
  const accentClass = accent ? `accent-${accent}` : ''
  document.documentElement.className = [base, accentClass].filter(Boolean).join(' ')
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
