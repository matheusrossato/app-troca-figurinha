import { useEffect } from 'react'
import { Routes, Route, NavLink, Link } from 'react-router-dom'
import Home from './pages/Home'
import Capture from './pages/Capture'
import Collection from './pages/Collection'
import Review from './pages/Review'
import Settings from './pages/Settings'
import { prewarmBackend } from './lib/gemini'

export default function App() {
  // Esquenta a Cloud Run no boot pra mascarar o cold start (~3-5s)
  // antes da primeira foto. Best-effort; falhas são silenciosas.
  useEffect(() => {
    prewarmBackend()
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-tight">
          Álbum Copa 2026 <span className="hidden text-neutral-500 sm:inline">— minha coleção</span>
        </h1>
        <Link
          to="/settings"
          aria-label="Ajustes"
          className="grid h-9 w-9 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/review" element={<Review />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <TabLink to="/" label="Início" />
        <TabLink to="/capture" label="Escanear" />
        <TabLink to="/collection" label="Coleção" />
      </nav>
    </div>
  )
}

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `py-3 text-center text-sm font-medium transition ${
          isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
        }`
      }
    >
      {label}
    </NavLink>
  )
}
