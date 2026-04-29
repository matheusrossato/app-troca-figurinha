import { Link } from 'react-router-dom'
import { ALBUM_TOTAL } from '../data/album'
import { useCollection } from '../hooks/useCollection'

export default function Home() {
  const { stats, loading } = useCollection()
  const pct = Math.round((stats.tidas / ALBUM_TOTAL) * 100)

  return (
    <div className="space-y-5">
      <Hero pct={pct} tidas={stats.tidas} total={ALBUM_TOTAL} />

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Tidas" value={stats.tidas} accent="emerald" />
        <Stat label="Faltam" value={stats.faltantes} accent="amber" />
        <Stat label="Repetidas" value={stats.repetidas} accent="sky" />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/capture"
          className="bg-fwc-rainbow shadow-gold-glow rounded-2xl p-[2px] transition active:scale-[0.99]"
        >
          <div className="rounded-[14px] bg-[#0a0a0f] px-4 py-4 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
              Câmera
            </div>
            <div className="mt-0.5 text-base font-bold text-white">Escanear página</div>
          </div>
        </Link>
        <Link
          to="/collection"
          className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-4 text-center transition hover:border-neutral-700 active:scale-[0.99]"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Banco
          </div>
          <div className="mt-0.5 text-base font-bold text-white">Ver coleção</div>
        </Link>
      </div>

      {!loading && stats.tidas === 0 && (
        <p className="rounded-xl border border-gold-700/30 bg-gold-500/5 px-4 py-3 text-sm text-gold-200">
          <strong className="text-gold-400">Comece</strong> tirando foto de uma página do álbum.
          Em modo "Repetidas (verso)", espalhe as figurinhas com o verso virado.
        </p>
      )}

      <VersionBadge />
    </div>
  )
}

function Hero({ pct, tidas, total }: { pct: number; tidas: number; total: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-neutral-900 bg-gradient-to-br from-neutral-950 via-[#1a1209] to-neutral-950 p-5">
      {/* sutil overlay arco-íris no topo */}
      <div className="bg-fwc-rainbow absolute inset-x-0 top-0 h-1 opacity-90" />
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
            Progresso do álbum
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums text-white">{pct}%</span>
            <span className="text-sm text-neutral-500">
              {tidas} / {total}
            </span>
          </div>
        </div>
        <Trophy />
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-900">
        <div
          className="bg-fwc-rainbow h-full transition-all duration-700"
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </section>
  )
}

function Trophy() {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="trophyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#a87a0e" />
        </linearGradient>
      </defs>
      <path
        d="M22 8 h20 v6 h6 v6 a8 8 0 0 1 -8 8 h-1.5 a10 10 0 0 1 -7 7 v6 h6 v6 h-19 v-6 h6 v-6 a10 10 0 0 1 -7 -7 H16 a8 8 0 0 1 -8 -8 v-6 h6 z M16 16 v4 a4 4 0 0 0 4 4 h2 v-8 z M48 16 v8 h2 a4 4 0 0 0 4 -4 v-4 z"
        fill="url(#trophyGrad)"
      />
    </svg>
  )
}

const ACCENT_CLASSES: Record<string, { value: string; label: string; ring: string }> = {
  emerald: {
    value: 'text-emerald-300',
    label: 'text-emerald-400/70',
    ring: 'border-emerald-900/40 bg-emerald-950/20',
  },
  amber: {
    value: 'text-amber-300',
    label: 'text-amber-400/70',
    ring: 'border-amber-900/40 bg-amber-950/20',
  },
  sky: {
    value: 'text-sky-300',
    label: 'text-sky-400/70',
    ring: 'border-sky-900/40 bg-sky-950/20',
  },
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: keyof typeof ACCENT_CLASSES
}) {
  const c = ACCENT_CLASSES[accent]
  return (
    <div className={`rounded-2xl border ${c.ring} px-3 py-3`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wide ${c.label}`}>
        {label}
      </div>
      <div className={`mt-0.5 text-2xl font-black tabular-nums ${c.value}`}>{value}</div>
    </div>
  )
}

function VersionBadge() {
  const built = new Date(__APP_BUILD_TIME__)
  const builtLabel = built.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="pt-4 text-center text-[11px] text-neutral-600">
      v{__APP_VERSION__} · build {builtLabel}
    </div>
  )
}
