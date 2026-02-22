import type { ImageRecord } from '../lib/supabase'
import type { EloEntry } from '../lib/storage'

export interface Matchup {
  left: ImageRecord
  right: ImageRecord
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick up to `count` images, preferring those with fewer matchups
 * so newer photos get rated faster.
 */
export function selectTournamentImages(
  images: ImageRecord[],
  eloMap: Map<string, EloEntry>,
  count: number = 32
): ImageRecord[] {
  if (images.length <= count) return shuffle(images)

  const sorted = [...images].sort((a, b) => {
    const aMatchups = eloMap.get(a.id)?.matchups ?? 0
    const bMatchups = eloMap.get(b.id)?.matchups ?? 0
    return aMatchups - bMatchups
  })

  // Take top half by fewest matchups, fill rest randomly
  const fewerMatchups = sorted.slice(0, Math.floor(count * 0.7))
  const rest = sorted.slice(Math.floor(count * 0.7))
  const randomFill = shuffle(rest).slice(0, count - fewerMatchups.length)

  return shuffle([...fewerMatchups, ...randomFill])
}

export function generateBracket(images: ImageRecord[]): Matchup[] {
  const matchups: Matchup[] = []
  for (let i = 0; i < images.length - 1; i += 2) {
    matchups.push({ left: images[i], right: images[i + 1] })
  }
  return matchups
}

export function advanceWinners(
  winners: ImageRecord[]
): Matchup[] | null {
  if (winners.length <= 1) return null
  return generateBracket(winners)
}
