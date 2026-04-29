import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type CaptureMode,
  type CapturedImage,
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

type Status = 'starting' | 'live' | 'capturing' | 'preview' | 'denied' | 'error'

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
  const [preview, setPreview] = useState<CapturedImage | null>(null)
  const [focus, setFocus] = useState<FocusState>({
    raw: 0,
    smoothed: 0,
    quality: 'searching',
    stable: false,
  })

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status !== 'starting') return
    if (!videoRef.current) return

    let cancelled = false
    ;(async () => {
      try {
        const stream = await startRearCamera(videoRef.current!)
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        setStatus('live')
      } catch (err) {
        if (cancelled) return
        const e = err as DOMException | Error
        if ((e as DOMException).name === 'NotAllowedError') setStatus('denied')
        else {
          setStatus('error')
          setErrorMsg(e.message || 'Não foi possível iniciar a câmera.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (status !== 'live') return
    // Reseta tracker E estado React do foco. Sem o reset do estado, após
    // "Refazer foto" o focus.stable=true (resíduo da captura anterior)
    // dispara o useEffect de auto-captura no instante em que volta pra
    // 'live', sem dar tempo de re-enquadrar.
    trackerRef.current.reset()
    setFocus({ raw: 0, smoothed: 0, quality: 'searching', stable: false })
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
      setPreview(shot)
      setStatus('preview')
    } catch (err) {
      const e = err as Error
      setStatus('error')
      setErrorMsg(e.message)
    }
  }

  function handleRetake() {
    setPreview(null)
    setStatus('starting')
  }

  function handleSubmit() {
    if (!preview) return
    navigate('/review', { state: { capture: preview, mode } })
  }

  if (status === 'denied') {
    return (
      <Box>
        <h2 className="text-base font-semibold text-trophy-gold">Permissão negada</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
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
        <p className="mt-2 text-sm text-on-surface-variant">{errorMsg}</p>
      </Box>
    )
  }

  if (status === 'preview' && preview) {
    return (
      <div className="-mx-4 -my-4 flex h-[calc(100vh-3.25rem-3.25rem)] flex-col bg-black">
        <div className="relative flex-1 overflow-hidden">
          <img
            src={preview.dataUrl}
            alt="captura"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        <div className="space-y-2.5 border-t border-navy-outline/30 bg-navy-bg/95 px-4 pt-3 pb-4 backdrop-blur-xl">
          <div className="text-center text-xs text-on-surface-variant">
            {mode === 'page' ? 'Página do álbum' : 'Repetidas (verso)'}
            <span className="mx-2 text-on-surface-variant/40">·</span>
            {preview.width}×{preview.height}
            <span className="mx-2 text-on-surface-variant/40">·</span>
            {(preview.blob.size / 1024).toFixed(0)} KB
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRetake}
              className="glass-card rounded-2xl px-4 py-3 font-semibold text-on-surface transition active:scale-[0.99]"
            >
              Refazer foto
            </button>
            <button
              onClick={handleSubmit}
              className="bg-fifa-pitch-gradient shadow-fifa-glow rounded-2xl p-[2px] transition active:scale-[0.99]"
            >
              <div className="rounded-[14px] bg-navy-bg/85 px-4 py-3 text-center backdrop-blur">
                <span className="text-sm font-bold text-white">Enviar →</span>
              </div>
            </button>
          </div>
        </div>
      </div>
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

      <div className="space-y-2.5 border-t border-navy-outline/30 bg-navy-bg/95 px-4 pt-3 pb-4 backdrop-blur-xl">
        <ModeToggle mode={mode} onChange={setMode} />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setAutoCapture((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              autoCapture
                ? 'border-pitch-green/40 bg-pitch-green/10 text-pitch-green-soft'
                : 'border-navy-outline/40 bg-navy-surface/60 text-on-surface-variant'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoCapture ? 'bg-pitch-green shadow-pitch-glow' : 'bg-on-surface-variant/40'
              }`}
            />
            Auto-captura
          </button>
          <FocusBadge quality={focus.quality} smoothed={focus.smoothed} />
        </div>

        <button
          onClick={doCapture}
          disabled={status !== 'live'}
          className="bg-fifa-pitch-gradient shadow-fifa-glow w-full rounded-2xl p-[2px] transition active:scale-[0.99] disabled:opacity-50"
        >
          <div className="rounded-[14px] bg-navy-bg/85 px-4 py-3 text-center backdrop-blur">
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

/**
 * Overlay de scan inspirado no design system: 4 brackets nos cantos do
 * "focus frame" + linha laser horizontal animada quando está nítido.
 * A cor dos brackets reflete o estado do foco.
 */
function FocusOverlay({
  quality,
  status,
  autoCapture,
}: {
  quality: FocusQuality
  status: Status
  autoCapture: boolean
}) {
  const bracketColor =
    quality === 'sharp'
      ? '#00f260'
      : quality === 'ok'
        ? '#f9d423'
        : quality === 'low'
          ? '#ff6b6b'
          : '#aac7ff'

  const showLaser = status === 'live' && quality === 'sharp'

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="relative h-[88%] w-[92%] overflow-hidden rounded-2xl"
        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.30)' }}
      >
        {/* 4 brackets nos cantos */}
        <Bracket pos="tl" color={bracketColor} />
        <Bracket pos="tr" color={bracketColor} />
        <Bracket pos="bl" color={bracketColor} />
        <Bracket pos="br" color={bracketColor} />

        {/* laser horizontal animado quando nítido */}
        {showLaser && (
          <div
            className="absolute inset-x-0 h-0.5 animate-[scan_2s_linear_infinite]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${bracketColor} 50%, transparent 100%)`,
              boxShadow: `0 0 8px ${bracketColor}`,
            }}
          />
        )}
      </div>

      {status === 'starting' && (
        <span className="absolute bottom-4 text-xs text-on-surface-variant">
          Iniciando câmera…
        </span>
      )}
      {status === 'capturing' && (
        <span className="absolute bottom-4 rounded-full bg-pitch-green/90 px-3 py-1 text-xs font-semibold text-black shadow-pitch-glow">
          📸 capturando
        </span>
      )}
      {status === 'live' && autoCapture && quality === 'sharp' && (
        <span className="absolute bottom-4 rounded-full bg-pitch-green/90 px-3 py-1 text-xs font-semibold text-black shadow-pitch-glow">
          nítido
        </span>
      )}

      <style>{`
        @keyframes scan {
          0%   { top: 8%;  opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 92%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function Bracket({
  pos,
  color,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br'
  color: string
}) {
  const base = 'absolute h-9 w-9 transition-colors duration-200'
  const positions: Record<typeof pos, string> = {
    tl: 'top-2 left-2 border-t-[3px] border-l-[3px] rounded-tl-xl',
    tr: 'top-2 right-2 border-t-[3px] border-r-[3px] rounded-tr-xl',
    bl: 'bottom-2 left-2 border-b-[3px] border-l-[3px] rounded-bl-xl',
    br: 'bottom-2 right-2 border-b-[3px] border-r-[3px] rounded-br-xl',
  }
  return (
    <div
      className={`${base} ${positions[pos]}`}
      style={{ borderColor: color, boxShadow: `0 0 14px -2px ${color}` }}
    />
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
    searching: { label: 'buscando…', color: 'text-on-surface-variant/60' },
    low: { label: 'desfocado', color: 'text-red-400' },
    ok: { label: 'razoável', color: 'text-trophy-gold' },
    sharp: { label: 'nítido', color: 'text-pitch-green' },
  }
  const v = map[quality]
  return (
    <span className={`font-mono text-xs ${v.color}`}>
      {v.label} <span className="text-on-surface-variant/40">{Math.round(smoothed)}</span>
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
    <div className="glass-card grid grid-cols-2 rounded-xl p-1 text-sm">
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
        selected
          ? 'bg-fifa-blue/20 text-fifa-blue-soft'
          : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  )
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="glass-card rounded-xl px-4 py-6">{children}</div>
}
