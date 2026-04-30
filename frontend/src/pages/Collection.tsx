import { useEffect, useMemo, useRef, useState } from 'react'
import { ALL_STICKERS, TEAMS, type Sticker } from '../data/album'
import { useCollection } from '../hooks/useCollection'
import { decrementSticker, incrementSticker } from '../db'

type Filter = 'all' | 'owned' | 'missing' | 'duplicates'

interface SectionOption {
  code: string
  label: string
  /** texto pra busca (lowercase, sem acento) */
  search: string
}

const SECTION_OPTIONS: SectionOption[] = [
  {
    code: 'FWC',
    label: '⭐ FIFA World Cup (FWC) — intro + Museum',
    search: stripAccents('fwc fifa world cup intro museum especiais'),
  },
  ...TEAMS.map((t) => ({
    code: t.code,
    label: `${t.flag} ${t.name} · Grupo ${t.group} · ${t.code}`,
    search: stripAccents(`${t.code} ${t.name} grupo ${t.group}`),
  })),
  {
    code: 'CC',
    label: '🥤 Coca-Cola (CC) — patrocinados',
    search: stripAccents('cc coca cola patrocinados'),
  },
]

function stripAccents(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function labelFor(code: string): string {
  return SECTION_OPTIONS.find((o) => o.code === code)?.label ?? code
}

export default function Collection() {
  const { byId, loading } = useCollection()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())

  const list = useMemo(() => {
    return ALL_STICKERS.filter((s) => {
      // Multi-filtro de seção: vazio = tudo. Cada item escolhido é um OR.
      if (selectedSections.size > 0) {
        const ok =
          (selectedSections.has('FWC') && s.section === 'fwc') ||
          (selectedSections.has('CC') && s.section === 'cocacola') ||
          (s.section === 'team' && selectedSections.has(s.code))
        if (!ok) return false
      }

      const owned = byId.get(s.id)
      if (filter === 'owned') return !!owned
      if (filter === 'missing') return !owned
      if (filter === 'duplicates') return !!owned && owned.count > 1
      return true
    })
  }, [byId, filter, selectedSections])

  return (
    <div className="space-y-3">
      <FilterBar filter={filter} setFilter={setFilter} />
      <SectionMultiFilter
        selected={selectedSections}
        onChange={setSelectedSections}
      />

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

/**
 * Filtro multi-select de seções com busca por digitação.
 * Selecionados aparecem como chips no topo (clicar remove).
 * Lista filtra conforme você digita; tap numa opção alterna seleção.
 * Vazio = "Todas as seções".
 */
function SectionMultiFilter({
  selected,
  onChange,
}: {
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = useMemo(() => {
    const q = stripAccents(query.trim())
    if (!q) return SECTION_OPTIONS
    return SECTION_OPTIONS.filter((o) => o.search.includes(q))
  }, [query])

  function toggle(code: string) {
    const next = new Set(selected)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange(next)
  }

  function clearAll() {
    onChange(new Set())
    setQuery('')
  }

  return (
    <div ref={containerRef} className="glass-card relative rounded-xl p-2">
      {/* Chips das seções selecionadas */}
      {selected.size > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {Array.from(selected).map((code) => (
            <button
              key={code}
              onClick={() => toggle(code)}
              className="flex items-center gap-1 rounded-full bg-fifa-blue/20 px-2 py-0.5 text-xs text-fifa-blue-soft transition hover:bg-fifa-blue/30"
            >
              <span>{labelFor(code)}</span>
              <span className="text-[10px] opacity-70">✕</span>
            </button>
          ))}
          <button
            onClick={clearAll}
            className="rounded-full px-2 py-0.5 text-xs text-on-surface-variant underline hover:text-on-surface"
          >
            limpar
          </button>
        </div>
      )}

      {/* Input de busca */}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          selected.size === 0
            ? 'Todas as seções — toque para filtrar'
            : 'Adicionar mais seções…'
        }
        className="w-full rounded-lg bg-navy-surface/40 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-fifa-blue/40"
      />

      {/* Dropdown de opções filtradas */}
      {open && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-xl border border-navy-outline/40 bg-navy-surface-2/95 py-1 shadow-2xl backdrop-blur-xl">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-on-surface-variant">
              Nenhuma seção encontrada
            </li>
          )}
          {filtered.map((o) => {
            const isOn = selected.has(o.code)
            return (
              <li key={o.code}>
                <button
                  onClick={() => toggle(o.code)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                    isOn
                      ? 'bg-fifa-blue/15 text-fifa-blue-soft'
                      : 'text-on-surface hover:bg-navy-surface-3/60'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isOn && <span className="ml-2 text-pitch-green">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
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
