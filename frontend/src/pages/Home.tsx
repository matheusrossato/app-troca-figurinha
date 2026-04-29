import { Link } from 'react-router-dom'
import { ALBUM_TOTAL } from '../data/album'
import { useCollection } from '../hooks/useCollection'

export default function Home() {
  const { stats, loading } = useCollection()

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <Stat label="Tidas" value={stats.tidas} accent="text-emerald-400" />
        <Stat label="Faltantes" value={stats.faltantes} accent="text-amber-400" />
        <Stat label="Repetidas" value={stats.repetidas} accent="text-sky-400" />
        <Stat label="Total" value={ALBUM_TOTAL} accent="text-neutral-300" />
      </section>

      <Progress tidas={stats.tidas} total={ALBUM_TOTAL} />

      <Link
        to="/capture"
        className="block rounded-xl bg-brand-500 px-5 py-4 text-center font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 active:scale-[0.99]"
      >
        Escanear página do álbum
      </Link>

      {!loading && stats.tidas === 0 && (
        <p className="px-1 text-sm text-neutral-500">
          Nenhuma figurinha cadastrada ainda. Tire foto de uma página, o app reconhece os
          números das figurinhas presentes.
        </p>
      )}

      <VersionBadge />
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
    <div className="pt-6 text-center text-[11px] text-neutral-600">
      v{__APP_VERSION__} · build {builtLabel}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
    </div>
  )
}

function Progress({ tidas, total }: { tidas: number; total: number }) {
  const pct = Math.round((tidas / total) * 100)
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <div className="flex items-baseline justify-between text-xs text-neutral-400">
        <span>Progresso do álbum</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
