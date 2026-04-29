import { useEffect } from 'react'
import { Routes, Route, NavLink, Link } from 'react-router-dom'
import Home from './pages/Home'
import Capture from './pages/Capture'
import Collection from './pages/Collection'
import Review from './pages/Review'
import Settings from './pages/Settings'
import { prewarmBackend } from './lib/gemini'

export default function App() {
  useEffect(() => {
    prewarmBackend()
  }, [])

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0f]">
      <header className="sticky top-0 z-10 border-b border-neutral-900 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="bg-fwc-rainbow h-1.5 w-full" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo26 className="h-8 w-8 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                Álbum
              </span>
              <span className="text-base font-bold tracking-tight text-white">
                Copa 2026
              </span>
            </div>
          </Link>
          <Link
            to="/settings"
            aria-label="Ajustes"
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-900 hover:text-gold-300"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
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

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-900 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="grid grid-cols-3">
          <TabLink to="/" label="Início" />
          <TabLink to="/capture" label="Escanear" />
          <TabLink to="/collection" label="Coleção" />
        </div>
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
        `relative py-3 text-center text-sm font-semibold transition ${
          isActive ? 'text-gold-400' : 'text-neutral-500 hover:text-neutral-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <span className="bg-fwc-rainbow absolute inset-x-6 top-0 h-0.5 rounded-full" />
          )}
        </>
      )}
    </NavLink>
  )
}

/**
 * Logo "26" inspirado no estilo da identidade da Copa: número grosso e
 * cantos arredondados, fundo dourado com troféu silhueta. Não reproduz a
 * marca oficial — só evoca o visual.
 */
function Logo26({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="26">
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="55%" stopColor="#f5b800" />
          <stop offset="100%" stopColor="#a87a0e" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#goldGrad)" />
      <rect x="2" y="2" width="60" height="60" rx="14" fill="black" opacity="0.08" />
      <text
        x="50%"
        y="56%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter Tight, system-ui, sans-serif"
        fontWeight="900"
        fontSize="34"
        fill="#0a0a0f"
        letterSpacing="-2"
      >
        26
      </text>
      {/* Pequeno troféu acima do "26" */}
      <path
        d="M28 12 h8 v3 h2 v3 a3 3 0 0 1 -3 3 h-1 v2 h-4 v-2 h-1 a3 3 0 0 1 -3 -3 v-3 h2 z"
        fill="#0a0a0f"
        opacity="0.85"
      />
    </svg>
  )
}
