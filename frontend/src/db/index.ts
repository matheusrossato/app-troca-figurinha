import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CaptureMode } from '../lib/camera'

const DB_NAME = 'album-copa-2026'
const DB_VERSION = 2
const STORE = 'owned'
const PENDING_STORE = 'pendingAnalysis'

export interface OwnedSticker {
  id: string
  count: number
  firstAddedAt: number
  lastUpdatedAt: number
}

/**
 * Análise da IA persistida pra sobreviver a refresh / navegação.
 * Sempre só uma por vez (chave fixa 'current').
 */
export interface PendingAnalysisRecord {
  id: 'current'
  captureBlob: Blob
  captureWidth: number
  captureHeight: number
  captureMode: CaptureMode
  startedAt: number
  status: 'running' | 'done' | 'error'
  /** Resultado serializado quando status='done'. Sets/Maps viraram arrays. */
  result?: SerializedResult
  errorMessage?: string
}

export interface SerializedResult {
  ids: { id: string; raw: string; confidence: number }[]
  filledIds: string[]
  counts: [string, number][]
  rawText: string
  durationMs: number
  source: 'gemini' | 'tesseract'
  team: string | null
  page: number | null
  mode: CaptureMode
}

interface Schema extends DBSchema {
  owned: {
    key: string
    value: OwnedSticker
  }
  pendingAnalysis: {
    key: 'current'
    value: PendingAnalysisRecord
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function getDB(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(PENDING_STORE)) {
          db.createObjectStore(PENDING_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function getAllOwned(): Promise<OwnedSticker[]> {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function getOwned(id: string): Promise<OwnedSticker | undefined> {
  const db = await getDB()
  return db.get(STORE, id)
}

export async function incrementSticker(id: string, by = 1): Promise<OwnedSticker> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const existing = await tx.store.get(id)
  const now = Date.now()
  const next: OwnedSticker = existing
    ? { ...existing, count: existing.count + by, lastUpdatedAt: now }
    : { id, count: by, firstAddedAt: now, lastUpdatedAt: now }
  await tx.store.put(next)
  await tx.done
  notify()
  return next
}

export async function decrementSticker(id: string, by = 1): Promise<OwnedSticker | null> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const existing = await tx.store.get(id)
  if (!existing) {
    await tx.done
    return null
  }
  const newCount = existing.count - by
  if (newCount <= 0) {
    await tx.store.delete(id)
    await tx.done
    notify()
    return null
  }
  const next: OwnedSticker = { ...existing, count: newCount, lastUpdatedAt: Date.now() }
  await tx.store.put(next)
  await tx.done
  notify()
  return next
}

export async function bulkAdd(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const now = Date.now()
  await Promise.all(
    ids.map(async (id) => {
      const existing = await tx.store.get(id)
      const next: OwnedSticker = existing
        ? { ...existing, count: existing.count + 1, lastUpdatedAt: now }
        : { id, count: 1, firstAddedAt: now, lastUpdatedAt: now }
      await tx.store.put(next)
    }),
  )
  await tx.done
  notify()
}

/** Soma `delta` ao count de cada id. Cria se não existir. */
export async function bulkIncrement(deltas: Map<string, number>): Promise<void> {
  if (deltas.size === 0) return
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const now = Date.now()
  await Promise.all(
    Array.from(deltas.entries()).map(async ([id, delta]) => {
      if (delta <= 0) return
      const existing = await tx.store.get(id)
      const next: OwnedSticker = existing
        ? { ...existing, count: existing.count + delta, lastUpdatedAt: now }
        : { id, count: delta, firstAddedAt: now, lastUpdatedAt: now }
      await tx.store.put(next)
    }),
  )
  await tx.done
  notify()
}

export async function clearAll(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE)
  notify()
}

export async function replaceAll(items: OwnedSticker[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  await tx.store.clear()
  await Promise.all(items.map((it) => tx.store.put(it)))
  await tx.done
  notify()
}

// ---- Pending analysis ----

export async function savePendingAnalysis(rec: PendingAnalysisRecord): Promise<void> {
  const db = await getDB()
  await db.put(PENDING_STORE, rec)
  notifyPending()
}

export async function getPendingAnalysis(): Promise<PendingAnalysisRecord | undefined> {
  const db = await getDB()
  return db.get(PENDING_STORE, 'current')
}

export async function clearPendingAnalysis(): Promise<void> {
  const db = await getDB()
  await db.delete(PENDING_STORE, 'current')
  notifyPending()
}

// ---- Notificação simples para hooks reagirem a mudanças ----
const listeners = new Set<() => void>()
function notify() {
  for (const cb of listeners) cb()
}
export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const pendingListeners = new Set<() => void>()
function notifyPending() {
  for (const cb of pendingListeners) cb()
}
export function subscribePending(cb: () => void): () => void {
  pendingListeners.add(cb)
  return () => pendingListeners.delete(cb)
}
