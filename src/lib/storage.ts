import { get, set, keys } from 'idb-keyval'

export interface EloEntry {
  imageId: string
  elo: number
  wins: number
  losses: number
  matchups: number
}

const ELO_PREFIX = 'elo_'
const BACKUP_META_KEY = 'backup_code'

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    return navigator.storage.persist()
  }
  return false
}

export async function getElo(imageId: string): Promise<EloEntry> {
  const entry = await get<EloEntry>(`${ELO_PREFIX}${imageId}`)
  return entry ?? { imageId, elo: 1500, wins: 0, losses: 0, matchups: 0 }
}

export async function setElo(entry: EloEntry): Promise<void> {
  await set(`${ELO_PREFIX}${entry.imageId}`, entry)
}

export async function getAllElos(): Promise<EloEntry[]> {
  const allKeys = await keys()
  const eloKeys = allKeys.filter((k) =>
    typeof k === 'string' && k.startsWith(ELO_PREFIX)
  )
  const entries: EloEntry[] = []
  for (const key of eloKeys) {
    const entry = await get<EloEntry>(key)
    if (entry) entries.push(entry)
  }
  return entries
}

export async function exportAllElos(): Promise<Record<string, EloEntry>> {
  const entries = await getAllElos()
  const map: Record<string, EloEntry> = {}
  for (const e of entries) {
    map[e.imageId] = e
  }
  return map
}

export async function importAllElos(
  data: Record<string, EloEntry>
): Promise<void> {
  for (const entry of Object.values(data)) {
    await setElo(entry)
  }
}

export async function upsertAllElos(entries: EloEntry[]): Promise<void> {
  for (const entry of entries) {
    await setElo(entry)
  }
}

export async function getBackupCode(): Promise<string | null> {
  return (await get<string>(BACKUP_META_KEY)) ?? null
}

export async function setBackupCode(code: string): Promise<void> {
  await set(BACKUP_META_KEY, code)
}
