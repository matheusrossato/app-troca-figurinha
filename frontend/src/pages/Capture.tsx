import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type CaptureMode,
  captureFrame,
  startRearCamera,
  stopStream,
} from '../lib/camera'
import {
  type FocusQuality,
  type FocusState,
  createFocusTracker,
  measureSharpness,
} from '../lib/blur-detection'

type Status = 'starting' | 'live' | 'capturing' | 'denied' | 'error'

const ANALYSIS_INTERVAL_MS = 100

export default function Capture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackerRef = useRef(createFocusTracker())
  const intervalRef = useRef<number | null>(null)
  const navigate = useNavigate()

  const [status, setStatus] = useState<Status>('starting')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [mode, setMode] = useState<CaptureMode>('page')
  const [autoCapture, setAutoCapture] = useState<boolean>(true)
  const [focus, setFocus] = useState<FocusState>({
    raw: 0,
    smoothed: 0,
    quality: 'searching',
    stable: false,
  })

  // Inicializa câmera no mount.
  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!videoRef.current) return
      setStatus('starting')
      try {
        const stream = await startRearCamera(videoRef.current)
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        setStatus('live')
      } catch (err) {
        const e = err as DOMException | Error
        if ((e as DOMException).name === 'NotAllowedError') setStatus('denied')
        else {
          setStatus('error')
          setErrorMsg(e.message || 'Não foi possível iniciar a câmera.')
        }
      }
    }
    start()
    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  // Loop de medição de nitidez quando está "live" e não capturando.
  useEffect(() => {
    if (status !== 'live') return
    trackerRef.current.reset()
    const id = window.setInterval(() => {
      if (!videoRef.current) return
      const sharpness = measureSharpness(videoRef.current)
      const state = trackerRef.current.push(sharpness)
      setFocus(state)
    }, ANALYSIS_INTERVAL_MS)
    intervalRef.current = id
    return () => {
      window.clearInterval(id)
      intervalRef.current = null
    }
  }, [status])

  // Auto-captura quando estável + autoCapture ligado.
  useEffect(() => {
    if (!autoCapture) return
    if (status !== 'live') return
    if (!focus.stable) return
    void doCapture()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.stable, autoCapture, status])

  async function doCapture() {
    if (!videoRef.current || status === 'capturing') return
    setStatus('capturing')
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    try {
      const shot = await captureFrame(videoRef.current, mode)
      stopStream(streamRef.current)
      streamRef.current = null
      try {
        navigator.vibrate?.(40)
      } catch {
        /* opcional */
      }
      navigate('/review', { state: { capture: shot, mode } })
    } catch (err) {
      const e = err as Error
      setStatus('error')
      setErrorMsg(e.message)
    }
  }

  if (status === 'denied') {
    return (
      <Box>
        <h2 className="text-base font-semibold text-amber-300">Permissão negada</h2>
        <p className="mt-2 text-sm text-neutral-400">
          O navegador bloqueou o acesso à câmera. Abra as configurações do site no Chrome,
          permita "Câmera" e recarregue.
        </p>
      </Box>
    )
  }

  if (status === 'error') {
    return (
      <Box>
        <h2 className="text-base font-semibold text-red-300">Erro</h2>
        <p className="mt-2 text-sm text-neutral-400">{errorMsg}</p>
      </Box>
    )
  }

  return (
    <div className="-mx-4 -my-4 flex h-[calc(100vh-3.25rem-3.25rem)] flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        <FocusOverlay quality={focus.quality} status={status} autoCapture={autoCapture} />
      </div>

      <div className="space-y-2.5 border-t border-neutral-900 bg-[#0a0a0f] px-4 pt-3 pb-4">
        <ModeToggle mode={mode} onChange={setMode} />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setAutoCapture((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              autoCapture
                ? 'border-gold-700 bg-gold-500/10 text-gold-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoCapture ? 'bg-gold-400' : 'bg-neutral-600'
              }`}
            />
            Auto-captura
          </button>
          <FocusBadge quality={focus.quality} smoothed={focus.smoothed} />
        </div>

        <button
          onClick={doCapture}
          disabled={status !== 'live'}
          className="bg-fwc-rainbow shadow-gold-glow w-full rounded-2xl p-[2px] transition active:scale-[0.99] disabled:opacity-50"
        >
          <div className="rounded-[14px] bg-[#0a0a0f] px-4 py-3 text-center">
            <span className="text-sm font-bold text-white">
              {status === 'capturing'
                ? 'Capturando…'
                : mode === 'page'
                  ? 'Capturar página'
                  : 'Capturar versos'}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

function FocusOverlay({
  quality,
  status,
  autoCapture,
}: {
  quality: FocusQuality
  status: Status
  autoCapture: boolean
}) {
  const ringColor =
    quality === 'sharp'
      ? 'border-emerald-400'
      : quality === 'ok'
        ? 'border-amber-400'
        : quality === 'low'
          ? 'border-red-500/70'
          : 'border-neutral-500/40'

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className={`h-[88%] w-[92%] rounded-2xl border-2 ${ringColor} transition-colors duration-200`}
        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.20)' }}
      />
      {status === 'starting' && (
        <span className="absolute bottom-4 text-xs text-neutral-300">
          Iniciando câmera…
        </span>
      )}
      {status === 'capturing' && (
        <span className="absolute bottom-4 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-black">
          📸 capturando
        </span>
      )}
      {status === 'live' && autoCapture && quality === 'sharp' && (
        <span className="absolute bottom-4 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-black">
          nítido
        </span>
      )}
    </div>
  )
}

function FocusBadge({
  quality,
  smoothed,
}: {
  quality: FocusQuality
  smoothed: number
}) {
  const map: Record<FocusQuality, { label: string; color: string }> = {
    searching: { label: 'buscando…', color: 'text-neutral-500' },
    low: { label: 'desfocado', color: 'text-red-400' },
    ok: { label: 'razoável', color: 'text-amber-300' },
    sharp: { label: 'nítido', color: 'text-emerald-400' },
  }
  const v = map[quality]
  return (
    <span className={`font-mono text-xs ${v.color}`}>
      {v.label} <span className="text-neutral-600">{Math.round(smoothed)}</span>
    </span>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: CaptureMode
  onChange: (m: CaptureMode) => void
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-1 text-sm">
      <ToggleButton selected={mode === 'page'} onClick={() => onChange('page')}>
        Página do álbum
      </ToggleButton>
      <ToggleButton selected={mode === 'backs'} onClick={() => onChange('backs')}>
        Repetidas (verso)
      </ToggleButton>
    </div>
  )
}

function ToggleButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 font-semibold transition ${
        selected ? 'bg-neutral-800 text-gold-300' : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {children}
    </button>
  )
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-4 py-6">
      {children}
    </div>
  )
}
