import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface ImageRecord {
  id: string
  filename: string
  created_at: string
}

export function getThumbUrl(imageId: string): string {
  return `${supabaseUrl}/storage/v1/object/public/thumbs/${imageId}.webp`
}

export function getFullUrl(imageId: string): string {
  return `${supabaseUrl}/storage/v1/object/public/full/${imageId}.webp`
}

export async function fetchAllImages(): Promise<ImageRecord[]> {
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
  filename: string
): Promise<void> {
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
    .insert({ id, filename })

  if (error) throw error
}
