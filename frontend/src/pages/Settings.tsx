import { useRef, useState } from 'react'
import { clearAll, getAllOwned, replaceAll, type OwnedSticker } from '../db'
import { useCollection } from '../hooks/useCollection'
import { ALBUM_TOTAL } from '../data/album'

const EXPORT_VERSION = 1

interface ExportFile {
  app: 'album-copa-2026'
  version: number
  exportedAt: string
  total: number
  owned: OwnedSticker[]
}

export default function Settings() {
  const { stats } = useCollection()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleExport() {
    const owned = await getAllOwned()
    const payload: ExportFile = {
      app: 'album-copa-2026',
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      total: ALBUM_TOTAL,
      owned,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `album-copa-2026_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMessage({ type: 'ok', text: `Exportadas ${owned.length} figurinhas.` })
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Partial<ExportFile>
      if (data.app !== 'album-copa-2026' || !Array.isArray(data.owned)) {
        throw new Error('Arquivo não parece um backup deste app.')
      }
      const valid = data.owned.filter(
        (o): o is OwnedSticker =>
          typeof o?.id === 'string' &&
          typeof o.count === 'number' &&
          typeof o.firstAddedAt === 'number' &&
          typeof o.lastUpdatedAt === 'number',
      )
      await replaceAll(valid)
      setMessage({ type: 'ok', text: `Importadas ${valid.length} figurinhas.` })
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message })
    }
  }

  async function handleClear() {
    const ok = window.confirm(
      'Apagar TODAS as figurinhas registradas? Faça um export primeiro se quiser backup.',
    )
    if (!ok) return
    await clearAll()
    setMessage({ type: 'ok', text: 'Coleção apagada.' })
  }

  return (
    <div className="space-y-3">
      <Section title="Backup">
        <p className="mb-3 text-sm text-neutral-400">
          {stats.tidas} figurinhas tidas · {stats.totalCopias} cópias totais.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-medium text-neutral-200 transition active:scale-[0.99]"
          >
            Exportar JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-medium text-neutral-200 transition active:scale-[0.99]"
          >
            Importar JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </Section>

      <Section title="Zona de risco">
        <button
          onClick={handleClear}
          className="w-full rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm font-medium text-red-300 transition active:scale-[0.99]"
        >
          Apagar tudo
        </button>
      </Section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-900 bg-emerald-950/20 text-emerald-200'
              : 'border-red-900 bg-red-950/30 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <Section title="Sobre">
        <p className="text-sm text-neutral-400">
          PWA local-first para gerenciar a coleção do álbum Panini FIFA World Cup 2026
          (980 figurinhas, 112 páginas). Reconhecimento de figurinhas via Tesseract.js
          local. Dados no IndexedDB do navegador.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h2>
      {children}
    </section>
  )
}
