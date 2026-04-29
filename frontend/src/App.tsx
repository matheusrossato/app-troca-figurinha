import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Capture from './pages/Capture'
import Collection from './pages/Collection'
import Review from './pages/Review'
import Settings from './pages/Settings'
import Missing from './pages/Missing'
import { prewarmBackend } from './lib/gemini'
import { getPendingAnalysis, subscribePending, type PendingAnalysisRecord } from './db'

export default function App() {
  useEffect(() => {
    prewarmBackend()
  }, [])

  return (
    <div className="flex min-h-full flex-col bg-navy-bg">
      <header className="sticky top-0 z-10 border-b border-navy-outline/30 bg-navy-bg/85 backdrop-blur-xl">
        <div className="bg-fwc-rainbow h-1.5 w-full" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-meu-album.png" alt="Meu Álbum 2026" className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                Meu Álbum
              </span>
              <span className="text-base font-bold tracking-tight text-white">
                Copa 2026
              </span>
            </div>
          </Link>
          <Link
            to="/settings"
            aria-label="Ajustes"
            className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition hover:bg-navy-surface hover:text-gold-300"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </header>

      <PendingAnalysisBanner />

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/review" element={<Review />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/missing" element={<Missing />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-navy-outline/30 bg-navy-bg/90 backdrop-blur-xl">
        <div className="grid grid-cols-3">
          <TabLink to="/" label="Início" />
          <TabLink to="/capture" label="Escanear" />
          <TabLink to="/collection" label="Coleção" />
        </div>
      </nav>
    </div>
  )
}

/**
 * Banner sticky logo abaixo do header — aparece quando há análise da IA
 * persistida e o usuário não está na tela de Review. Toque retoma.
 */
function PendingAnalysisBanner() {
  const location = useLocation()
  const [pending, setPending] = useState<PendingAnalysisRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      const rec = await getPendingAnalysis()
      if (!cancelled) setPending(rec ?? null)
    }
    void refresh()
    const unsub = subscribePending(() => void refresh())
    return () => {
      cancelled = true
      unsub()
    }
  }, [location.pathname])

  if (!pending) return null
  if (location.pathname === '/review') return null

  const isRunning = pending.status === 'running'
  const isError = pending.status === 'error'
  const label = isError
    ? 'Análise falhou — toque para retomar'
    : isRunning
      ? 'Análise em andamento — toque para retomar'
      : 'Análise pronta — toque para revisar'
  const tone = isError
    ? 'border-red-500/40 bg-red-500/10 text-red-200'
    : isRunning
      ? 'border-fifa-blue/40 bg-fifa-blue/10 text-fifa-blue-soft'
      : 'border-pitch-green/40 bg-pitch-green/10 text-pitch-green-soft'

  return (
    <Link
      to="/review"
      className={`mx-4 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur ${tone}`}
    >
      <span className="grid h-2 w-2 place-items-center">
        {isRunning && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-fifa-blue-soft" />
        )}
        {!isRunning && (
          <span className={`h-2 w-2 rounded-full ${isError ? 'bg-red-300' : 'bg-pitch-green'}`} />
        )}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[10px] opacity-70">→</span>
    </Link>
  )
}

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative py-3 text-center text-sm font-semibold transition ${
          isActive ? 'text-gold-400' : 'text-on-surface-variant hover:text-on-surface'
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
