import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { TechnicianAuthProvider } from './lib/TechnicianAuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename mirrors Vite's `base` (vite.config.ts) so routes match once
        the app is served from a subpath, e.g. GitHub Pages project sites
        at https://<user>.github.io/<repo>/ rather than the domain root. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* Outside Routes, not just around /dashboard — Navbar (Login/Signup
          vs. Profile icon) needs the same auth state on every route, not
          only the protected one. TechnicianAuthProvider sits alongside
          AuthProvider (not nested inside/around it) — customer and
          technician auth are two independent session checks against two
          different endpoints, neither depending on the other. */}
      <AuthProvider>
        <TechnicianAuthProvider>
          <App />
        </TechnicianAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
