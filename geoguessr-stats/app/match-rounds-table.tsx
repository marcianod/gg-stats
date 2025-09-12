import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ProcessedDuel } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MatchRoundsTableProps {
  duel: ProcessedDuel
}

/**
 * Displays a table with a round-by-round breakdown of a duel.
 */
export function MatchRoundsTable({ duel }: MatchRoundsTableProps) {
  const { rounds } = duel
  
  // Find the player and opponent from the `teams` array within the duel.
  // This logic is now self-contained and doesn't rely on external constants.
  const myPlayer = duel.teams?.find(team => team.players.some(p => 'isMe' in p && p.isMe))?.players[0];
  const opponentPlayer = duel.teams?.find(team => team.players.some(p => 'isMe' in p && !p.isMe))?.players[0];

  // Combine player and opponent guesses with round info for easy rendering.
  // We add a check to ensure myPlayer and its guesses exist before mapping.
  const roundDetails = myPlayer?.guesses.map((playerGuess, index) => {
    // Safely access the corresponding opponent's guess for the same round.
    const opponentGuess = opponentPlayer?.guesses[index]
    const roundInfo = rounds?.[index]
    return {
      roundNumber: index + 1,
      country: roundInfo?.countryCode || 'N/A',
      playerScore: playerGuess.score,
      // Use optional chaining and the nullish coalescing operator for safety.
      opponentScore: opponentGuess?.score ?? 0,
      distance: `${((playerGuess.distanceInMeters as number) / 1000).toFixed(1)} km`,
      time: `${(playerGuess.time as number).toFixed(1)}s`,
    }
  })

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Round Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Round #</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">My Score</TableHead>
              <TableHead className="text-right">Opponent Score</TableHead>
              <TableHead className="text-right">Distance</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roundDetails?.map(detail => (
              <TableRow key={detail.roundNumber}>
                <TableCell className="font-medium">{detail.roundNumber}</TableCell>
                <TableCell>{detail.country}</TableCell>
                <TableCell className="text-right">{typeof detail.playerScore === 'number' ? detail.playerScore.toLocaleString() : detail.playerScore}</TableCell>
                <TableCell className="text-right">{typeof detail.opponentScore === 'number' ? detail.opponentScore.toLocaleString() : detail.opponentScore}</TableCell>
                <TableCell className="text-right">{detail.distance}</TableCell>
                <TableCell className="text-right">{detail.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}