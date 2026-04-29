import { Link } from 'react-router-dom'
import { ALBUM_TOTAL } from '../data/album'
import { useCollection } from '../hooks/useCollection'

export default function Home() {
  const { stats, loading } = useCollection()
  const pct = Math.round((stats.tidas / ALBUM_TOTAL) * 100)

  return (
    <div className="space-y-5">
      <Hero pct={pct} tidas={stats.tidas} total={ALBUM_TOTAL} repetidas={stats.repetidas} />

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Tidas" value={stats.tidas} accent="green" />
        <Stat label="Faltam" value={stats.faltantes} accent="blue" />
        <Stat label="Repetidas" value={stats.repetidas} accent="gold" />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/capture"
          className="bg-fifa-pitch-gradient shadow-fifa-glow rounded-2xl p-[2px] transition active:scale-[0.99]"
        >
          <div className="rounded-[14px] bg-navy-bg/85 px-4 py-4 text-center backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pitch-green-soft">
              Câmera
            </div>
            <div className="mt-0.5 text-base font-bold text-white">Escanear página</div>
          </div>
        </Link>
        <Link
          to="/collection"
          className="glass-card rounded-2xl px-4 py-4 text-center transition hover:bg-navy-surface-3/80 active:scale-[0.99]"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Banco
          </div>
          <div className="mt-0.5 text-base font-bold text-on-surface">Ver coleção</div>
        </Link>
      </div>

      {!loading && stats.tidas === 0 && (
        <p className="rounded-xl border border-gold-700/40 bg-gold-500/5 px-4 py-3 text-sm text-gold-200">
          <strong className="text-gold-400">Comece</strong> tirando foto de uma página do álbum.
          Em modo "Repetidas (verso)", espalhe as figurinhas com o verso virado.
        </p>
      )}

      <VersionBadge />
    </div>
  )
}

function Hero({
  pct,
  tidas,
  total,
  repetidas,
}: {
  pct: number
  tidas: number
  total: number
  repetidas: number
}) {
  const faltam = Math.max(0, total - tidas)
  const safePct = Math.max(pct, 1)

  return (
    <section className="glass-card relative overflow-hidden rounded-2xl p-5">
      {/* faixa arco-íris no topo (mantém referência ao álbum oficial) */}
      <div className="bg-fwc-rainbow absolute inset-x-0 top-0 h-1 opacity-90" />
      {/* glow ambiente azul→verde por trás */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fifa-blue/12 via-transparent to-pitch-green/8" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
            Progresso global
          </span>
          <span className="text-sm text-on-surface-variant">Caminho até completar o álbum</span>
        </div>
        <ProgressRing pct={safePct} />
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-3 gap-3 border-t border-navy-outline/30 pt-3">
        <HeroStat label="Total" value={`${tidas}/${total}`} tone="primary" />
        <HeroStat label="Faltam" value={faltam} tone="default" />
        <HeroStat label="Repetidas" value={repetidas} tone="gold" />
      </div>
    </section>
  )
}

function ProgressRing({ pct }: { pct: number }) {
  // SVG ring com gradient azul→verde (FIFA→Pitch)
  const radius = 15.9155
  const dash = `${pct}, 100`
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a84ff" />
            <stop offset="100%" stopColor="#00f260" />
          </linearGradient>
        </defs>
        <path
          d={`M18 2.0845 a ${radius} ${radius} 0 0 1 0 31.831 a ${radius} ${radius} 0 0 1 0 -31.831`}
          fill="none"
          stroke="rgba(139,145,160,0.18)"
          strokeWidth="3"
        />
        <path
          d={`M18 2.0845 a ${radius} ${radius} 0 0 1 0 31.831 a ${radius} ${radius} 0 0 1 0 -31.831`}
          fill="none"
          stroke="url(#ringGrad)"
          strokeDasharray={dash}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-extrabold tabular-nums text-on-surface">{pct}%</span>
      </div>
    </div>
  )
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: 'primary' | 'default' | 'gold'
}) {
  const valueCls =
    tone === 'primary'
      ? 'text-fifa-blue-soft'
      : tone === 'gold'
        ? 'text-trophy-gold'
        : 'text-on-surface'
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
        {label}
      </span>
      <span className={`mt-0.5 font-semibold tabular-nums ${valueCls}`}>{value}</span>
    </div>
  )
}

const ACCENT_CLASSES: Record<string, { value: string; label: string; ring: string }> = {
  green: {
    value: 'text-pitch-green',
    label: 'text-pitch-green/80',
    ring: 'border-pitch-green/30 bg-pitch-green/5',
  },
  blue: {
    value: 'text-fifa-blue-soft',
    label: 'text-fifa-blue-soft/70',
    ring: 'border-fifa-blue/30 bg-fifa-blue/5',
  },
  gold: {
    value: 'text-trophy-gold',
    label: 'text-trophy-gold/70',
    ring: 'border-trophy-gold/30 bg-trophy-gold/5',
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
    <div className={`rounded-2xl border ${c.ring} px-3 py-3 backdrop-blur-sm`}>
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
    <div className="pt-4 text-center text-[11px] text-on-surface-variant/50">
      v{__APP_VERSION__} · build {builtLabel}
    </div>
  )
}
