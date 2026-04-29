import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type CaptureMode,
  type CapturedImage,
  captureFrame,
  startRearCamera,
  stopStream,
} from '../lib/camera'

type Status = 'idle' | 'starting' | 'live' | 'denied' | 'error' | 'review'

export default function Capture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [mode, setMode] = useState<CaptureMode>('page')
  const [capture, setCapture] = useState<CapturedImage | null>(null)
  const navigate = useNavigate()

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
        if ((e as DOMException).name === 'NotAllowedError') {
          setStatus('denied')
        } else {
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

  async function handleCapture() {
    if (!videoRef.current) return
    try {
      const shot = await captureFrame(videoRef.current, mode)
      setCapture(shot)
      setStatus('review')
      stopStream(streamRef.current)
      streamRef.current = null
    } catch (err) {
      const e = err as Error
      setStatus('error')
      setErrorMsg(e.message)
    }
  }

  async function handleRetake() {
    setCapture(null)
    setStatus('starting')
    if (videoRef.current) {
      try {
        const stream = await startRearCamera(videoRef.current)
        streamRef.current = stream
        setStatus('live')
      } catch (err) {
        setStatus('error')
        setErrorMsg((err as Error).message)
      }
    }
  }

  function handleProceed() {
    if (!capture) return
    // OCR vem na task #5; por ora, simulamos navegando pra revisão.
    navigate('/review', { state: { capture } })
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

  if (status === 'review' && capture) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <img src={capture.dataUrl} alt="captura" className="block w-full" />
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-xs text-neutral-400">
          Modo: <span className="text-neutral-200">{mode === 'page' ? 'Página inteira' : 'Figurinha única'}</span>
          <span className="mx-2 text-neutral-700">·</span>
          {capture.width}×{capture.height}px
          <span className="mx-2 text-neutral-700">·</span>
          {(capture.blob.size / 1024).toFixed(0)} KB
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleRetake}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-medium text-neutral-200 transition active:scale-[0.99]"
          >
            Refazer
          </button>
          <button
            onClick={handleProceed}
            className="rounded-xl bg-brand-500 px-4 py-3 font-medium text-white transition hover:bg-brand-600 active:scale-[0.99]"
          >
            Reconhecer →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="block aspect-[3/4] w-full object-cover"
        />
        {status !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            Iniciando câmera…
          </div>
        )}
      </div>

      <ModeToggle mode={mode} onChange={setMode} />

      <button
        onClick={handleCapture}
        disabled={status !== 'live'}
        className="w-full rounded-xl bg-brand-500 px-5 py-4 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:shadow-none"
      >
        {mode === 'page' ? 'Capturar página' : 'Capturar figurinha'}
      </button>

      <p className="px-1 text-xs text-neutral-500">
        {mode === 'page'
          ? 'Enquadre a página inteira do álbum, com boa iluminação. O app vai tentar detectar todos os IDs visíveis.'
          : 'Enquadre uma única figurinha de perto, em foco. Use quando o reconhecimento da página inteira falhar.'}
      </p>
    </div>
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
        Página inteira
      </ToggleButton>
      <ToggleButton selected={mode === 'single'} onClick={() => onChange('single')}>
        Figurinha única
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
      className={`rounded-lg py-2 font-medium transition ${
        selected ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
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
