import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css' // <-- CAMBIAMOS index.css POR App.css
import App from './App_Sistema';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)