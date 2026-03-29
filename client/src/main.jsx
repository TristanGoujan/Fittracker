import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Dismiss splash after React's first paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash')
    const bar    = document.getElementById('splash-bar')
    if (!splash) return
    if (bar) bar.classList.add('complete')
    setTimeout(() => {
      splash.classList.add('splash-done')
      setTimeout(() => splash.remove(), 450)
    }, 200)
  })
})
