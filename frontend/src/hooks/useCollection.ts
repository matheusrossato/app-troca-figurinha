import { useEffect, useState } from 'react'
import { getAllOwned, subscribe, type OwnedSticker } from '../db'
import { ALBUM_TOTAL, ALL_STICKERS } from '../data/album'

export interface CollectionStats {
  tidas: number
  faltantes: number
  repetidas: number
  totalCopias: number
}

export interface CollectionState {
  loading: boolean
  byId: Map<string, OwnedSticker>
  stats: CollectionStats
}

export function useCollection(): CollectionState {
  const [state, setState] = useState<CollectionState>({
    loading: true,
    byId: new Map(),
    stats: { tidas: 0, faltantes: ALBUM_TOTAL, repetidas: 0, totalCopias: 0 },
  })

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const all = await getAllOwned()
      if (cancelled) return
      const byId = new Map(all.map((o) => [o.id, o]))
      setState({
        loading: false,
        byId,
        stats: computeStats(byId),
      })
    }

    refresh()
    const unsub = subscribe(() => refresh())
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return state
}

function computeStats(byId: Map<string, OwnedSticker>): CollectionStats {
  let tidas = 0
  let repetidas = 0
  let totalCopias = 0
  for (const sticker of ALL_STICKERS) {
    const owned = byId.get(sticker.id)
    if (!owned) continue
    tidas++
    totalCopias += owned.count
    if (owned.count > 1) repetidas += owned.count - 1
  }
  return {
    tidas,
    faltantes: ALBUM_TOTAL - tidas,
    repetidas,
    totalCopias,
  }
}
