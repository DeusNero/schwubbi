import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const fallbackUrl = 'https://placeholder.invalid'
const fallbackKey = 'placeholder-anon-key'

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = createClient(supabaseUrl ?? fallbackUrl, supabaseAnonKey ?? fallbackKey)

export interface CloudEloEntry {
  imageId: string
  elo: number
  wins: number
  losses: number
  matchups: number
}

export interface ImageRecord {
  id: string
  filename: string
  created_at: string
  content_hash?: string | null
}

export interface BackfillProgress {
  total: number
  processed: number
  hashed: number
  failed: number
}

export type UploadImageResult =
  | { status: 'uploaded' }
  | { status: 'duplicate' }

export function getThumbUrl(imageId: string): string {
  if (!hasSupabaseConfig) return ''
  return `${supabaseUrl}/storage/v1/object/public/thumbs/${imageId}.webp`
}

export function getFullUrl(imageId: string): string {
  if (!hasSupabaseConfig) return ''
  return `${supabaseUrl}/storage/v1/object/public/full/${imageId}.webp`
}

export async function fetchAllImages(): Promise<ImageRecord[]> {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function uploadImage(
  id: string,
  thumbBlob: Blob,
  fullBlob: Blob,
  filename: string,
  contentHash: string
): Promise<UploadImageResult> {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  const [thumbResult, fullResult] = await Promise.all([
    supabase.storage.from('thumbs').upload(`${id}.webp`, thumbBlob, {
      contentType: 'image/webp',
      upsert: false,
    }),
    supabase.storage.from('full').upload(`${id}.webp`, fullBlob, {
      contentType: 'image/webp',
      upsert: false,
    }),
  ])

  if (thumbResult.error) throw thumbResult.error
  if (fullResult.error) throw fullResult.error

  const { error } = await supabase
    .from('images')
    .insert({ id, filename, content_hash: contentHash })

  if (!error) {
    return { status: 'uploaded' }
  }

  if (error.code === '23505') {
    await Promise.allSettled([
      supabase.storage.from('thumbs').remove([`${id}.webp`]),
      supabase.storage.from('full').remove([`${id}.webp`]),
    ])
    return { status: 'duplicate' }
  }

  throw error
}

export async function hashBlobSha256(blob: Blob): Promise<string> {
  const raw = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', raw)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hasImageWithContentHash(contentHash: string): Promise<boolean> {
  if (!hasSupabaseConfig) return false
  const { data, error } = await supabase
    .from('images')
    .select('id')
    .eq('content_hash', contentHash)
    .limit(1)

  if (error) throw error
  return Boolean(data && data.length > 0)
}

export async function backfillMissingContentHashes(
  onProgress?: (progress: BackfillProgress) => void
): Promise<BackfillProgress> {
  if (!hasSupabaseConfig) {
    return { total: 0, processed: 0, hashed: 0, failed: 0 }
  }

  const { data, error } = await supabase
    .from('images')
    .select('id')
    .is('content_hash', null)

  if (error) throw error

  const missing = data ?? []
  const progress: BackfillProgress = {
    total: missing.length,
    processed: 0,
    hashed: 0,
    failed: 0,
  }
  onProgress?.(progress)

  for (const row of missing) {
    try {
      const fullUrl = getFullUrl(row.id)
      if (!fullUrl) throw new Error('Missing full image URL')
      const response = await fetch(fullUrl, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`)
      }

      const blob = await response.blob()
      const contentHash = await hashBlobSha256(blob)
      const { error: updateError } = await supabase
        .from('images')
        .update({ content_hash: contentHash })
        .eq('id', row.id)
        .is('content_hash', null)

      if (updateError) throw updateError
      progress.hashed += 1
    } catch (err) {
      console.warn('Backfill hash failed', row.id, err)
      progress.failed += 1
    } finally {
      progress.processed += 1
      onProgress?.({ ...progress })
    }
  }

  return progress
}

export async function ensureAnonymousSession(): Promise<string | null> {
  if (!hasSupabaseConfig) return null

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.warn('Failed to read Supabase session', sessionError)
  }

  if (sessionData.session?.user?.id) return sessionData.session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.warn('Anonymous auth is unavailable', error)
    return null
  }

  return data.user?.id ?? null
}

export async function fetchCloudLeaderboard(): Promise<CloudEloEntry[]> {
  if (!hasSupabaseConfig) return []
  const userId = await ensureAnonymousSession()
  if (!userId) return []

  const { data, error } = await supabase
    .from('leaderboards')
    .select('image_id, elo, wins, losses, matchups')
    .eq('user_id', userId)

  if (error) throw error
  if (!data) return []

  return data.map((row) => ({
    imageId: row.image_id,
    elo: row.elo,
    wins: row.wins,
    losses: row.losses,
    matchups: row.matchups,
  }))
}

export async function upsertCloudLeaderboard(entries: CloudEloEntry[]): Promise<void> {
  if (!hasSupabaseConfig || entries.length === 0) return
  const userId = await ensureAnonymousSession()
  if (!userId) return

  const payload = entries.map((entry) => ({
    user_id: userId,
    image_id: entry.imageId,
    elo: entry.elo,
    wins: entry.wins,
    losses: entry.losses,
    matchups: entry.matchups,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('leaderboards')
    .upsert(payload, { onConflict: 'user_id,image_id' })

  if (error) throw error
}
