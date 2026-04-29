import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { CapturedImage } from '../lib/camera'
import { recognizeStickerIds, type DetectedId } from '../lib/ocr'
import { isGeminiConfigured, recognizeWithGemini } from '../lib/gemini'
import { STICKERS_BY_ID, TEAMS_BY_CODE } from '../data/album'
import { bulkAdd } from '../db'

interface LocationState {
  capture?: CapturedImage
}

interface RecognitionResult {
  ids: DetectedId[]
  filledIds: Set<string>
  rawText: string
  durationMs: number
  source: 'gemini' | 'tesseract'
  team: string | null
  page: number | null
}

type Status = 'running' | 'done' | 'error'

export default function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const capture = state?.capture

  const [status, setStatus] = useState<Status>('running')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!capture) return
    let cancelled = false
    setStatus('running')
    setProgress(0)

    runRecognition(capture.blob, (p) => !cancelled && setProgress(p))
      .then((r) => {
        if (cancelled) return
        setResult(r)
        // Gemini retorna `filled=true` para figurinhas coladas na foto.
        // Pré-selecionamos essas — são exatamente as que o usuário tem.
        // Se for fallback Tesseract, marcamos tudo (não distingue).
        const initial =
          r.source === 'gemini' && r.filledIds.size > 0
            ? new Set(r.filledIds)
            : new Set(r.ids.map((d) => d.id))
        setSelected(initial)
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
  }, [capture])

  if (!capture) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-4 py-12 text-center text-neutral-400">
          Nenhuma captura para revisar.
        </div>
        <Link
          to="/capture"
          className="block rounded-xl bg-brand-500 px-4 py-3 text-center font-medium text-white"
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

  async function handleConfirm() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    await bulkAdd(ids)
    navigate('/')
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <img src={capture.dataUrl} alt="captura" className="block w-full" />
      </div>

      {status === 'running' && <ProgressBox progress={progress} />}

      {status === 'error' && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          Falha no reconhecimento: {errorMsg}
        </div>
      )}

      {status === 'done' && result && (
        <ResultPanel
          result={result}
          selected={selected}
          onToggle={toggle}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}

async function runRecognition(
  blob: Blob,
  onProgress: (p: number) => void,
): Promise<RecognitionResult> {
  if (isGeminiConfigured()) {
    try {
      onProgress(0.1)
      const r = await recognizeWithGemini(blob)
      onProgress(1)
      return {
        ids: r.ids,
        filledIds: r.filledIds,
        rawText: r.rawText,
        durationMs: r.durationMs,
        source: 'gemini',
        team: r.team,
        page: r.page,
      }
    } catch (err) {
      console.warn('gemini failed, falling back to tesseract', err)
    }
  }

  const r = await recognizeStickerIds(blob, onProgress)
  return {
    ids: r.ids,
    filledIds: new Set(),
    rawText: r.rawText,
    durationMs: r.durationMs,
    source: 'tesseract',
    team: null,
    page: null,
  }
}

function ProgressBox({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <div className="text-sm text-neutral-300">Reconhecendo…</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-right text-xs tabular-nums text-neutral-500">{pct}%</div>
    </div>
  )
}

function ResultPanel({
  result,
  selected,
  onToggle,
  onConfirm,
}: {
  result: RecognitionResult
  selected: Set<string>
  onToggle: (id: string) => void
  onConfirm: () => void
}) {
  if (result.ids.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-900 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          Nenhum código detectado. Tente refazer a foto com mais luz e enquadramento da página inteira.
        </div>
        <DebugRaw result={result} />
        <Link
          to="/capture"
          className="block rounded-xl bg-brand-500 px-4 py-3 text-center font-medium text-white"
        >
          Refazer captura
        </Link>
      </div>
    )
  }

  const teamName = result.team ? TEAMS_BY_CODE.get(result.team)?.name : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span>
          {result.ids.length} detectada{result.ids.length === 1 ? '' : 's'}
        </span>
        {result.source === 'gemini' && result.filledIds.size > 0 && (
          <span className="text-emerald-400">
            {result.filledIds.size} colada{result.filledIds.size === 1 ? '' : 's'}
          </span>
        )}
        {teamName && <span className="text-neutral-300">{teamName}</span>}
        {result.page && <span>p. {result.page}</span>}
        <span>·</span>
        <span>{result.source === 'gemini' ? 'Gemini' : 'Tesseract'}</span>
        <span>{Math.round(result.durationMs)}ms</span>
      </div>

      {result.source === 'gemini' && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/30 px-3 py-2 text-xs text-neutral-400">
          Pré-selecionei as figurinhas que aparecem coladas na foto. Toque para
          ajustar antes de salvar.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2">
        {result.ids.map((d) => {
          const sticker = STICKERS_BY_ID.get(d.id)
          const isOn = selected.has(d.id)
          const isFilled = result.filledIds.has(d.id)
          return (
            <li key={d.id}>
              <button
                onClick={() => onToggle(d.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  isOn
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-neutral-800 bg-neutral-900/50 text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                  <span>{d.id}</span>
                  {result.source === 'gemini' && (
                    <span
                      className={`ml-auto text-[10px] uppercase tracking-wide ${
                        isFilled ? 'text-emerald-400' : 'text-neutral-600'
                      }`}
                    >
                      {isFilled ? 'colada' : 'vazio'}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-neutral-500">
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
        className="w-full rounded-xl bg-brand-500 px-5 py-4 font-medium text-white transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-700"
      >
        Salvar {selected.size} figurinha{selected.size === 1 ? '' : 's'}
      </button>

      <DebugRaw result={result} />
    </div>
  )
}

function DebugRaw({ result }: { result: RecognitionResult }) {
  return (
    <details className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-3 text-xs">
      <summary className="cursor-pointer text-neutral-400">
        Debug ({result.source}): toque pra expandir
      </summary>
      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-tight text-neutral-500">
        {result.rawText.trim() || '(vazio)'}
      </pre>
    </details>
  )
}
