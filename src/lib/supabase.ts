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
  const thumbPath = `${id}.webp`
  const fullPath = `${id}.webp`

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

  if (thumbResult.error || fullResult.error) {
    const uploadedPaths = []
    if (!thumbResult.error) uploadedPaths.push(thumbPath)
    if (!fullResult.error) uploadedPaths.push(fullPath)

    if (uploadedPaths.length > 0) {
      await Promise.allSettled([
        supabase.storage.from('thumbs').remove([thumbPath]),
        supabase.storage.from('full').remove([fullPath]),
      ])
    }

    throw thumbResult.error ?? fullResult.error
  }

  const { error } = await supabase
    .from('images')
    .insert({ id, filename, content_hash: contentHash })

  if (!error) {
    return { status: 'uploaded' }
  }

  if (error.code === '23505') {
    await Promise.allSettled([
      supabase.storage.from('thumbs').remove([thumbPath]),
      supabase.storage.from('full').remove([fullPath]),
    ])
    return { status: 'duplicate' }
  }

  await Promise.allSettled([
    supabase.storage.from('thumbs').remove([thumbPath]),
    supabase.storage.from('full').remove([fullPath]),
  ])
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

// --- Profiles ---

export interface PlayerProfile {
  userId: string
  displayName: string
  funTitle: string
}

const FUN_TITLE_ADJECTIVES = [
  'Fluffy', 'Sneaky', 'Cozy', 'Fuzzy', 'Mighty', 'Sleepy', 'Cheeky',
  'Jolly', 'Purrfect', 'Bouncy', 'Sassy', 'Cuddly', 'Daring', 'Gentle',
  'Swift', 'Dreamy', 'Lucky', 'Spicy', 'Sparkly', 'Toasty',
]

const FUN_TITLE_NOUNS = [
  'Whisker', 'Yarn Master', 'Paw Captain', 'Purr Lord', 'Kitten Knight',
  'Meow Scout', 'Catnip Baron', 'Toe Bean', 'Fur Wizard', 'Tail Chaser',
  'Nap King', 'Scratch Hero', 'Milk Thief', 'Box Explorer', 'Floof General',
  'Chirp Champ', 'Biscuit Maker', 'Laser Hunter', 'Snuggle Boss', 'Zoomie Star',
]

export function generateFunTitle(): string {
  const adj = FUN_TITLE_ADJECTIVES[Math.floor(Math.random() * FUN_TITLE_ADJECTIVES.length)]
  const noun = FUN_TITLE_NOUNS[Math.floor(Math.random() * FUN_TITLE_NOUNS.length)]
  return `${adj} ${noun}`
}

export async function fetchOwnProfile(): Promise<PlayerProfile | null> {
  if (!hasSupabaseConfig) return null
  const userId = await ensureAnonymousSession()
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, fun_title')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) { console.warn('fetchOwnProfile error', error); return null }
  if (!data) return null

  return { userId: data.user_id, displayName: data.display_name, funTitle: data.fun_title }
}

export async function upsertProfile(displayName: string, funTitle: string): Promise<PlayerProfile | null> {
  if (!hasSupabaseConfig) return null
  const userId = await ensureAnonymousSession()
  if (!userId) return null

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      display_name: displayName,
      fun_title: funTitle,
    }, { onConflict: 'user_id' })

  if (error) { console.warn('upsertProfile error', error); return null }
  return { userId, displayName, funTitle }
}

export async function fetchAllProfiles(): Promise<PlayerProfile[]> {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, fun_title')

  if (error) { console.warn('fetchAllProfiles error', error); return [] }
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    funTitle: row.fun_title,
  }))
}

// --- Community Favorites ---

export interface CommunityFavorite {
  userId: string
  imageId: string
  elo: number
  rank: number
}

export async function fetchCommunityFavorites(): Promise<CommunityFavorite[]> {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('leaderboards')
    .select('user_id, image_id, elo')
    .gt('matchups', 0)
    .order('elo', { ascending: false })

  if (error) { console.warn('fetchCommunityFavorites error', error); return [] }
  if (!data) return []

  const byUser = new Map<string, CommunityFavorite[]>()
  for (const row of data) {
    const list = byUser.get(row.user_id) ?? []
    if (list.length < 3) {
      list.push({
        userId: row.user_id,
        imageId: row.image_id,
        elo: row.elo,
        rank: list.length + 1,
      })
      byUser.set(row.user_id, list)
    }
  }

  return Array.from(byUser.values()).flat()
}

export async function clearCloudLeaderboard(): Promise<void> {
  if (!hasSupabaseConfig) return
  const userId = await ensureAnonymousSession()
  if (!userId) return

  const { error } = await supabase
    .from('leaderboards')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
}
