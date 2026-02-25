import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { requestPersistentStorage } from './lib/storage'

requestPersistentStorage()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}

const normalizedBasenameRaw = import.meta.env.BASE_URL.replace(/\/+$/, '')
const normalizedBasename = normalizedBasenameRaw || '/'
const resolvedBasename =
  typeof window !== 'undefined' && !window.location.pathname.startsWith(normalizedBasename)
    ? '/'
    : normalizedBasename

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={resolvedBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
