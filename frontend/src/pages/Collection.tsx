import { useMemo, useState } from 'react'
import { ALL_STICKERS, TEAMS, type Sticker } from '../data/album'
import { useCollection } from '../hooks/useCollection'
import { decrementSticker, incrementSticker } from '../db'

type Filter = 'all' | 'owned' | 'missing' | 'duplicates'

export default function Collection() {
  const { byId, loading } = useCollection()
  const [filter, setFilter] = useState<Filter>('all')
  const [teamCode, setTeamCode] = useState<string>('all')

  const list = useMemo(() => {
    return ALL_STICKERS.filter((s) => {
      if (teamCode !== 'all' && s.code !== teamCode) {
        if (s.section === 'team') return false
      }
      if (teamCode !== 'all' && s.section !== 'team') return false

      const owned = byId.get(s.id)
      if (filter === 'owned') return !!owned
      if (filter === 'missing') return !owned
      if (filter === 'duplicates') return !!owned && owned.count > 1
      return true
    })
  }, [byId, filter, teamCode])

  return (
    <div className="space-y-3">
      <FilterBar filter={filter} setFilter={setFilter} />
      <TeamFilter teamCode={teamCode} setTeamCode={setTeamCode} />

      <div className="text-xs text-on-surface-variant/70">
        {loading ? 'Carregando…' : `${list.length} figurinhas`}
      </div>

      <ul className="space-y-1.5">
        {list.map((s) => (
          <StickerRow key={s.id} sticker={s} count={byId.get(s.id)?.count ?? 0} />
        ))}
      </ul>
    </div>
  )
}

function FilterBar({
  filter,
  setFilter,
}: {
  filter: Filter
  setFilter: (f: Filter) => void
}) {
  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'owned', label: 'Tidas' },
    { key: 'missing', label: 'Faltantes' },
    { key: 'duplicates', label: 'Repetidas' },
  ]
  return (
    <div className="glass-card grid grid-cols-4 gap-1 rounded-xl p-1 text-xs">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setFilter(t.key)}
          className={`rounded-lg py-2 font-medium transition ${
            filter === t.key
              ? 'bg-fifa-blue/20 text-fifa-blue-soft shadow-[inset_0_0_0_1px_rgba(170,199,255,0.25)]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function TeamFilter({
  teamCode,
  setTeamCode,
}: {
  teamCode: string
  setTeamCode: (c: string) => void
}) {
  return (
    <select
      value={teamCode}
      onChange={(e) => setTeamCode(e.target.value)}
      className="glass-card w-full rounded-xl px-3 py-2 text-sm text-on-surface"
    >
      <option value="all">Todas as seções</option>
      {TEAMS.map((t) => (
        <option key={t.code} value={t.code}>
          {t.flag} {t.name} · Grupo {t.group}
        </option>
      ))}
    </select>
  )
}

function StickerRow({ sticker, count }: { sticker: Sticker; count: number }) {
  const owned = count > 0
  const dup = count > 1

  // Cores conforme estado:
  //  - dup: trophy-gold (item raro/repetido — destaque)
  //  - owned (não dup): pitch-green (sucesso)
  //  - missing: superfície neutra com borda dashed
  const containerCls = owned
    ? dup
      ? 'border-trophy-gold/35 bg-trophy-gold/5'
      : 'border-pitch-green/30 bg-pitch-green/5'
    : 'border-dashed border-navy-outline/40 bg-navy-surface/40'

  const idCls = owned ? 'text-on-surface' : 'text-on-surface-variant/60'

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 backdrop-blur-sm ${containerCls}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className={idCls}>{sticker.id}</span>
          {sticker.isSpecial && (
            <span className="rounded bg-trophy-gold/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-trophy-gold">
              especial
            </span>
          )}
          {dup && (
            <span className="ml-auto rounded-full bg-trophy-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-trophy-gold">
              ×{count}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-on-surface-variant/70">{sticker.label}</div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => decrementSticker(sticker.id)}
          disabled={!owned}
          className="h-8 w-8 rounded-lg border border-navy-outline/40 bg-navy-surface/60 text-on-surface-variant transition active:scale-95 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center font-mono text-sm tabular-nums text-on-surface">
          {count}
        </span>
        <button
          onClick={() => incrementSticker(sticker.id)}
          className="h-8 w-8 rounded-lg border border-navy-outline/40 bg-navy-surface/60 text-on-surface-variant transition active:scale-95"
        >
          +
        </button>
      </div>
    </li>
  )
}
