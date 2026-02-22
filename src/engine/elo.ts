import { getElo, setElo } from '../lib/storage'

const K = 32

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export async function updateElo(
  winnerId: string,
  loserId: string
): Promise<{ winnerElo: number; loserElo: number }> {
  const winner = await getElo(winnerId)
  const loser = await getElo(loserId)

  const expectedWin = expectedScore(winner.elo, loser.elo)
  const expectedLose = expectedScore(loser.elo, winner.elo)

  winner.elo = Math.round(winner.elo + K * (1 - expectedWin))
  loser.elo = Math.round(loser.elo + K * (0 - expectedLose))
  winner.wins += 1
  loser.losses += 1
  winner.matchups += 1
  loser.matchups += 1

  await Promise.all([setElo(winner), setElo(loser)])

  return { winnerElo: winner.elo, loserElo: loser.elo }
}
