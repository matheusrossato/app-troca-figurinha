import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { CapturedImage, CaptureMode } from '../lib/camera'
import { recognizeStickerIds, type DetectedId } from '../lib/ocr'
import { isGeminiConfigured, recognizeWithGemini } from '../lib/gemini'
import {
  CC_CODE,
  CC_IDS_BY_PAGE,
  FWC_CODE,
  FWC_IDS_BY_PAGE,
  STICKERS_BY_ID,
  STICKERS_PER_TEAM,
  TEAMS_BY_CODE,
} from '../data/album'
import { bulkAdd, bulkIncrement } from '../db'
import { useCollection } from '../hooks/useCollection'

interface LocationState {
  capture?: CapturedImage
  mode?: CaptureMode
}

interface RecognitionResult {
  ids: DetectedId[]
  filledIds: Set<string>
  counts: Map<string, number>
  rawText: string
  durationMs: number
  source: 'gemini' | 'tesseract'
  team: string | null
  page: number | null
  mode: CaptureMode
}

type Status = 'running' | 'done' | 'error'

export default function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const capture = state?.capture
  const mode: CaptureMode = state?.mode ?? capture?.mode ?? 'page'
  const collection = useCollection()

  const [status, setStatus] = useState<Status>('running')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [geminiError, setGeminiError] = useState<string>('')

  // Para mode='page': set de IDs marcados (toggle on/off)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Para mode='backs': contadores ajustáveis por ID antes de salvar
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!capture) return
    let cancelled = false
    setStatus('running')
    setProgress(0)

    runRecognition(
      capture.blob,
      mode,
      (p) => !cancelled && setProgress(p),
      (err) => !cancelled && setGeminiError(err),
    )
      .then((r) => {
        if (cancelled) return
        setResult(r)
        if (r.mode === 'backs') {
          setCounts(new Map(r.counts))
        } else {
          // Upsert inteligente: pré-seleciona só os filled que AINDA não estão
          // no banco. Os já-no-álbum ficam visíveis como "✓ no álbum" mas não
          // re-marcados (evita virar repetidos).
          const initial = new Set<string>()
          const filledSource =
            r.source === 'gemini' && r.filledIds.size > 0
              ? r.filledIds
              : new Set(r.ids.map((d) => d.id))
          for (const id of filledSource) {
            if (!collection.byId.has(id)) initial.add(id)
          }
          setSelected(initial)
        }
        setStatus('done')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setErrorMsg(err.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [capture, mode])

  if (!capture) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-navy-outline/30 bg-navy-surface/40 px-4 py-12 text-center text-neutral-400">
          Nenhuma captura para revisar.
        </div>
        <Link
          to="/capture"
          className="block rounded-xl bg-fifa-blue px-4 py-3 text-center font-medium text-white shadow-fifa-glow"
        >
          Ir para câmera
        </Link>
      </div>
    )
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function adjust(id: string, delta: number) {
    setCounts((prev) => {
      const next = new Map(prev)
      const current = next.get(id) ?? 0
      const updated = Math.max(0, current + delta)
      if (updated === 0) next.delete(id)
      else next.set(id, updated)
      return next
    })
  }

  async function handleConfirmPage() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    await bulkAdd(ids)
    navigate('/')
  }

  async function handleConfirmBacks() {
    if (counts.size === 0) return
    await bulkIncrement(counts)
    navigate('/')
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-navy-outline/30">
        <img src={capture.dataUrl} alt="captura" className="block w-full" />
      </div>

      {status === 'running' && <ProgressBox progress={progress} mode={mode} />}

      {status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur">
          Falha no reconhecimento: {errorMsg}
        </div>
      )}

      {status === 'done' && result && result.mode === 'page' && (
        <PageResultPanel
          result={result}
          selected={selected}
          onToggle={toggle}
          onConfirm={handleConfirmPage}
          geminiError={geminiError}
          ownedById={collection.byId}
        />
      )}

      {status === 'done' && result && result.mode === 'backs' && (
        <BacksResultPanel
          result={result}
          counts={counts}
          onAdjust={adjust}
          onConfirm={handleConfirmBacks}
          geminiError={geminiError}
        />
      )}
    </div>
  )
}

async function runRecognition(
  blob: Blob,
  mode: CaptureMode,
  onProgress: (p: number) => void,
  onGeminiError: (msg: string) => void,
): Promise<RecognitionResult> {
  if (isGeminiConfigured()) {
    try {
      onProgress(0.05)
      const r = await recognizeWithGemini(blob, {
        mode,
        onProgress: ({ progress }) => onProgress(progress),
      })
      onProgress(1)
      return {
        ids: r.ids,
        filledIds: r.filledIds,
        counts: r.counts,
        rawText: r.rawText,
        durationMs: r.durationMs,
        source: 'gemini',
        team: r.team,
        page: r.page,
        mode: r.mode,
      }
    } catch (err) {
      const msg = (err as Error).message || String(err)
      console.warn('gemini failed, falling back to tesseract', err)
      onGeminiError(msg)
    }
  }

  // Fallback Tesseract — só faz sentido pro mode 'page' (não distingue duplicatas).
  const r = await recognizeStickerIds(blob, onProgress)
  return {
    ids: r.ids,
    filledIds: new Set(),
    counts: new Map(r.ids.map((d) => [d.id, 1])),
    rawText: r.rawText,
    durationMs: r.durationMs,
    source: 'tesseract',
    team: null,
    page: null,
    mode,
  }
}

function ProgressBox({ progress, mode }: { progress: number; mode: CaptureMode }) {
  const pct = Math.round(progress * 100)
  return (
    <div className="glass-card rounded-xl px-4 py-3">
      <div className="text-sm text-on-surface">
        {mode === 'backs' ? 'Lendo versos…' : 'Reconhecendo página…'}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-surface-lowest">
        <div
          className="h-full bg-fifa-pitch-gradient transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-right text-xs tabular-nums text-on-surface-variant/60">{pct}%</div>
    </div>
  )
}

function expandExpectedIds(
  detected: DetectedId[],
  team: string | null,
  page: number | null,
): string[] {
  const set = new Set<string>(detected.map((d) => d.id))

  // Páginas de seleção têm sempre 20 IDs sequenciais (BRA1..BRA20),
  // então expandimos o range cheio quando temos um team identificado.
  if (team && TEAMS_BY_CODE.has(team)) {
    for (let i = 1; i <= STICKERS_PER_TEAM; i++) set.add(`${team}${i}`)
  }

  // FWC (intro + Museum) e Coca-Cola são heterogêneas: cada página tem
  // um subset diferente. Se Gemini detectou e retornou a página, usamos
  // o mapa por página pra preencher os esperados daquela página.
  if (page != null && detected.some((d) => d.id.startsWith(FWC_CODE))) {
    FWC_IDS_BY_PAGE.get(page)?.forEach((id) => set.add(id))
  }
  if (page != null && detected.some((d) => d.id.startsWith(CC_CODE))) {
    CC_IDS_BY_PAGE.get(page)?.forEach((id) => set.add(id))
  }

  return Array.from(set).sort((a, b) => {
    // Ordena por code primeiro, depois por número numericamente.
    const ma = a.match(/^([A-Z]+)(\d+)$/)
    const mb = b.match(/^([A-Z]+)(\d+)$/)
    if (!ma || !mb) return a.localeCompare(b)
    if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1])
    return Number(ma[2]) - Number(mb[2])
  })
}

function PageResultPanel({
  result,
  selected,
  onToggle,
  onConfirm,
  geminiError,
  ownedById,
}: {
  result: RecognitionResult
  selected: Set<string>
  onToggle: (id: string) => void
  onConfirm: () => void
  geminiError?: string
  ownedById: Map<string, { count: number }>
}) {
  if (result.ids.length === 0) {
    return <EmptyResult result={result} geminiError={geminiError} />
  }

  const team = result.team ? TEAMS_BY_CODE.get(result.team) : null
  const allIds = expandExpectedIds(result.ids, result.team, result.page)
  const detectedSet = new Set(result.ids.map((d) => d.id))
  const expectedNotDetected = allIds.filter((id) => !detectedSet.has(id))

  return (
    <div className="space-y-3">
      {team && (
        <div className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3">
          <span className="text-3xl leading-none">{team.flag}</span>
          <div className="flex-1">
            <div className="text-base font-bold text-on-surface">{team.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-on-surface-variant/70">
              Grupo {team.group} · {team.code}
            </div>
          </div>
          {result.page && (
            <span className="rounded-md bg-navy-surface-3/60 px-2 py-0.5 text-xs font-mono text-on-surface">
              p. {result.page}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-on-surface-variant/70">
        <span>
          {result.ids.length} detectada{result.ids.length === 1 ? '' : 's'}
        </span>
        {result.source === 'gemini' && result.filledIds.size > 0 && (
          <span className="text-pitch-green">
            {result.filledIds.size} colada{result.filledIds.size === 1 ? '' : 's'}
          </span>
        )}
        {expectedNotDetected.length > 0 && (
          <span className="text-on-surface-variant">
            +{expectedNotDetected.length} esperada{expectedNotDetected.length === 1 ? '' : 's'}
          </span>
        )}
        <span>·</span>
        <span>{result.source === 'gemini' ? 'Gemini' : 'Tesseract'}</span>
        <span>{Math.round(result.durationMs)}ms</span>
      </div>

      {result.source === 'gemini' && (
        <p className="glass-card rounded-lg px-3 py-2 text-xs text-on-surface-variant">
          Pré-selecionei só as figurinhas <strong className="text-trophy-gold">novas</strong> (coladas
          que ainda não tinha registrado). Cards <strong className="text-pitch-green">"no álbum"</strong>
          já estão na sua coleção e não duplicam — toque caso queira tratar como repetida.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2">
        {allIds.map((id) => {
          const sticker = STICKERS_BY_ID.get(id)
          const isOn = selected.has(id)
          const wasDetected = detectedSet.has(id)
          const isFilled = result.filledIds.has(id)
          const owned = ownedById.get(id)

          let tag: { label: string; cls: string }
          let containerCls: string
          if (owned) {
            tag = { label: `no álbum × ${owned.count}`, cls: 'text-pitch-green' }
            containerCls = isOn
              ? 'border-fifa-blue bg-fifa-blue/15 text-white'
              : 'border-pitch-green/30 bg-pitch-green/5 text-pitch-green-soft'
          } else if (!wasDetected) {
            tag = { label: 'esperada', cls: 'text-on-surface-variant/60' }
            containerCls = isOn
              ? 'border-fifa-blue bg-fifa-blue/15 text-white'
              : 'border-dashed border-navy-outline/40 bg-navy-surface/30 text-on-surface-variant/60'
          } else if (isFilled) {
            tag = { label: 'nova', cls: 'text-trophy-gold' }
            containerCls = isOn
              ? 'border-fifa-blue bg-fifa-blue/15 text-white'
              : 'border-trophy-gold/40 bg-trophy-gold/5 text-trophy-gold'
          } else {
            tag = { label: 'vazio', cls: 'text-on-surface-variant/50' }
            containerCls = isOn
              ? 'border-fifa-blue bg-fifa-blue/15 text-white'
              : 'border-navy-outline/30 bg-navy-surface/50 text-on-surface-variant'
          }

          return (
            <li key={id}>
              <button
                onClick={() => onToggle(id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${containerCls}`}
              >
                <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                  <span>{id}</span>
                  <span className={`ml-auto text-[10px] uppercase tracking-wide ${tag.cls}`}>
                    {tag.label}
                  </span>
                </div>
                <div className="truncate text-xs opacity-80">
                  {sticker?.label ?? '—'}
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        onClick={onConfirm}
        disabled={selected.size === 0}
        className="bg-fifa-pitch-gradient shadow-fifa-glow w-full rounded-2xl p-[2px] transition active:scale-[0.99] disabled:opacity-40"
      >
        <div className="rounded-[14px] bg-navy-bg/85 px-5 py-3 text-center backdrop-blur">
          <span className="text-sm font-bold text-white">
            {selected.size === 0
              ? 'Nada a adicionar'
              : `Adicionar ${selected.size} ao álbum`}
          </span>
        </div>
      </button>

      <DebugRaw result={result} />
    </div>
  )
}

function BacksResultPanel({
  result,
  counts,
  onAdjust,
  onConfirm,
  geminiError,
}: {
  result: RecognitionResult
  counts: Map<string, number>
  onAdjust: (id: string, delta: number) => void
  onConfirm: () => void
  geminiError?: string
}) {
  if (result.ids.length === 0) {
    return <EmptyResult result={result} geminiError={geminiError} />
  }

  const totalCopias = Array.from(counts.values()).reduce((a, b) => a + b, 0)
  const idsOrdered = Array.from(counts.keys()).sort()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-on-surface-variant/70">
        <span>{counts.size} ID{counts.size === 1 ? '' : 's'} distintos</span>
        <span className="text-fifa-blue-soft">
          {totalCopias} cópia{totalCopias === 1 ? '' : 's'} no total
        </span>
        <span>·</span>
        <span>{result.source === 'gemini' ? 'Gemini' : 'Tesseract'}</span>
        <span>{Math.round(result.durationMs)}ms</span>
      </div>

      <p className="glass-card rounded-lg px-3 py-2 text-xs text-on-surface-variant">
        Quantidade de cada ID detectado nos versos. Ajuste com − / + se Gemini
        contou errado, depois salve. Cada cópia soma ao seu estoque atual.
      </p>

      <ul className="space-y-1.5">
        {idsOrdered.map((id) => {
          const sticker = STICKERS_BY_ID.get(id)
          const count = counts.get(id) ?? 0
          return (
            <li
              key={id}
              className="glass-card flex items-center gap-3 rounded-xl px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-semibold text-on-surface">{id}</div>
                <div className="truncate text-xs text-on-surface-variant/70">
                  {sticker?.label ?? '—'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAdjust(id, -1)}
                  className="h-9 w-9 rounded-lg border border-navy-outline/40 bg-navy-surface/60 text-on-surface-variant transition active:scale-95"
                >
                  −
                </button>
                <span className="w-9 text-center font-mono text-base tabular-nums text-on-surface">
                  {count}
                </span>
                <button
                  onClick={() => onAdjust(id, +1)}
                  className="h-9 w-9 rounded-lg border border-navy-outline/40 bg-navy-surface/60 text-on-surface-variant transition active:scale-95"
                >
                  +
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button
        onClick={onConfirm}
        disabled={totalCopias === 0}
        className="bg-fifa-pitch-gradient shadow-fifa-glow w-full rounded-2xl p-[2px] transition active:scale-[0.99] disabled:opacity-40"
      >
        <div className="rounded-[14px] bg-navy-bg/85 px-5 py-3 text-center backdrop-blur">
          <span className="text-sm font-bold text-white">
            Adicionar {totalCopias} cópia{totalCopias === 1 ? '' : 's'} ao estoque
          </span>
        </div>
      </button>

      <DebugRaw result={result} />
    </div>
  )
}

function EmptyResult({
  result,
  geminiError,
}: {
  result: RecognitionResult
  geminiError?: string
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-trophy-gold/30 bg-trophy-gold/5 px-4 py-3 text-sm text-trophy-gold backdrop-blur">
        Nenhum código detectado. Fonte: <strong>{result.source}</strong>. Tente refazer a foto
        com mais luz e enquadramento.
      </div>
      {geminiError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 backdrop-blur">
          <div className="font-semibold text-red-200">Gemini falhou, caiu no Tesseract:</div>
          <div className="mt-1 break-words">{geminiError}</div>
        </div>
      )}
      <DebugRaw result={result} />
      <Link
        to="/capture"
        className="block rounded-xl bg-fifa-blue px-4 py-3 text-center font-medium text-white shadow-fifa-glow"
      >
        Refazer captura
      </Link>
    </div>
  )
}

function DebugRaw({ result }: { result: RecognitionResult }) {
  return (
    <details className="glass-card rounded-xl p-3 text-xs">
      <summary className="cursor-pointer text-on-surface-variant">
        Debug ({result.source} · {result.mode}): toque pra expandir
      </summary>
      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-tight text-on-surface-variant/70">
        {result.rawText.trim() || '(vazio)'}
      </pre>
    </details>
  )
}
