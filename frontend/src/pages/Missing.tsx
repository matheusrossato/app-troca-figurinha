import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ALBUM_TOTAL,
  ALL_STICKERS,
  CC_LAYOUT,
  FWC_LAYOUT,
  STICKERS_PER_TEAM,
  TEAMS,
} from '../data/album'
import { useCollection } from '../hooks/useCollection'

interface TeamMissing {
  code: string
  name: string
  group: string
  flag: string
  numbers: number[] // só os índices 1-20 que faltam
  total: number
}

interface SpecialMissing {
  id: string
  label: string
}

export default function Missing() {
  const { byId, stats, loading } = useCollection()

  const data = useMemo(() => {
    const fwcMissing: SpecialMissing[] = FWC_LAYOUT.filter((s) => !byId.has(s.id)).map(
      (s) => ({ id: s.id, label: s.label }),
    )
    const ccMissing: SpecialMissing[] = CC_LAYOUT.filter((s) => !byId.has(s.id)).map(
      (s) => ({ id: s.id, label: s.label }),
    )

    const teamsMissing: TeamMissing[] = TEAMS.map((t) => {
      const numbers: number[] = []
      for (let i = 1; i <= STICKERS_PER_TEAM; i++) {
        if (!byId.has(`${t.code}${i}`)) numbers.push(i)
      }
      return {
        code: t.code,
        name: t.name,
        group: t.group,
        flag: t.flag,
        numbers,
        total: numbers.length,
      }
    }).filter((t) => t.numbers.length > 0)

    const teamsByGroup = new Map<string, TeamMissing[]>()
    for (const t of teamsMissing) {
      const list = teamsByGroup.get(t.group) ?? []
      list.push(t)
      teamsByGroup.set(t.group, list)
    }

    return { fwcMissing, ccMissing, teamsByGroup }
  }, [byId])

  function handlePrint() {
    window.print()
  }

  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-4 print-root">
      {/* Toolbar (não imprime) */}
      <div className="no-print flex items-center gap-2">
        <Link
          to="/settings"
          className="glass-card rounded-xl px-3 py-2 text-sm text-on-surface-variant"
        >
          ← Voltar
        </Link>
        <button
          onClick={handlePrint}
          className="bg-fifa-pitch-gradient shadow-fifa-glow ml-auto rounded-xl p-[2px] transition active:scale-[0.99]"
        >
          <div className="rounded-[10px] bg-navy-bg/85 px-4 py-2 backdrop-blur">
            <span className="text-sm font-bold text-white">🖨️ Imprimir</span>
          </div>
        </button>
      </div>

      {/* Cabeçalho da impressão */}
      <header className="print-header">
        <h1 className="text-xl font-bold text-on-surface print:text-black">
          Álbum Copa 2026 — Faltantes
        </h1>
        <p className="text-sm text-on-surface-variant print:text-gray-700">
          {loading ? 'Carregando…' : `${stats.tidas} de ${ALBUM_TOTAL} tidas · ${stats.faltantes} faltantes`}
          <span className="mx-2">·</span>
          {stats.repetidas} repetidas
          <span className="mx-2">·</span>
          atualizado em {now}
        </p>
      </header>

      {!loading && stats.faltantes === 0 && (
        <div className="rounded-xl border border-pitch-green/30 bg-pitch-green/10 p-4 text-center text-pitch-green-soft">
          🎉 Álbum completo! Não há faltantes.
        </div>
      )}

      {/* Conteúdo: 2 colunas em A4 */}
      <div className="print-columns space-y-4">
        {(data.fwcMissing.length > 0 || data.ccMissing.length > 0) && (
          <section className="print-block glass-card rounded-xl p-3 print:border print:border-gray-300 print:bg-white print:p-2">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-trophy-gold print:text-black">
              Especiais
            </h2>
            <ul className="space-y-1">
              {data.fwcMissing.length > 0 && (
                <li className="text-xs leading-snug">
                  <span className="font-bold text-on-surface print:text-black">⭐ FWC</span>
                  <span className="ml-1 text-on-surface-variant print:text-gray-600">
                    ({data.fwcMissing.length}):
                  </span>
                  <span className="ml-1 font-mono text-on-surface print:text-black">
                    {data.fwcMissing.map((s) => s.id.replace(/^FWC/, '')).join(', ')}
                  </span>
                </li>
              )}
              {data.ccMissing.length > 0 && (
                <li className="text-xs leading-snug">
                  <span className="font-bold text-on-surface print:text-black">🥤 CC</span>
                  <span className="ml-1 text-on-surface-variant print:text-gray-600">
                    ({data.ccMissing.length}):
                  </span>
                  <span className="ml-1 font-mono text-on-surface print:text-black">
                    {data.ccMissing.map((s) => s.id.replace(/^CC/, '')).join(', ')}
                  </span>
                </li>
              )}
            </ul>
          </section>
        )}

        {Array.from(data.teamsByGroup.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([group, teams]) => (
            <section
              key={group}
              className="print-block glass-card rounded-xl p-3 print:border print:border-gray-300 print:bg-white print:p-2"
            >
              <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-fifa-blue-soft print:text-black">
                Grupo {group}
              </h2>
              <ul className="space-y-1">
                {teams.map((t) => (
                  <li key={t.code} className="text-xs leading-snug">
                    <span className="font-mono font-bold text-on-surface print:text-black">
                      {t.code}
                    </span>
                    <span className="ml-1 text-on-surface print:text-black">
                      {t.flag} {t.name}
                    </span>
                    <span className="ml-1 text-on-surface-variant print:text-gray-600">
                      ({t.total === STICKERS_PER_TEAM ? 'todas' : t.total}):
                    </span>
                    <span className="ml-1 font-mono text-on-surface print:text-black">
                      {t.total === STICKERS_PER_TEAM
                        ? '1–20'
                        : t.numbers.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {/* Aviso quando não tem nenhuma faltante de seleção (só especiais) */}
        {!loading && data.teamsByGroup.size === 0 && stats.faltantes > 0 && (
          <p className="text-sm text-on-surface-variant print:text-gray-700">
            Nenhuma seleção com faltantes — só as figurinhas especiais acima.
          </p>
        )}
      </div>

      {/* Rodapé impresso */}
      <footer className="print-footer hidden print:block">
        <p className="mt-4 text-[10px] text-gray-500">
          Lista gerada por meualbum-copa2026.web.app — total: {ALL_STICKERS.length} figurinhas
        </p>
      </footer>
    </div>
  )
}
