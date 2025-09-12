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
import { cn } from '@/lib/utils'

interface MatchRoundsTableProps {
  duel: ProcessedDuel;
  onRoundSelect: (roundData: any) => void;
  selectedRound: any | null;
}

/**
 * Displays a table with a round-by-round breakdown of a duel.
 */
export function MatchRoundsTable({ duel, onRoundSelect, selectedRound }: MatchRoundsTableProps) {
  const { rounds } = duel
  
  const myPlayer = duel.teams?.find(team => team.players.some(p => p.isMe))?.players[0];
  const opponentPlayer = duel.teams?.find(team => !team.players.some(p => p.isMe))?.players[0];

  const roundDetails = myPlayer?.guesses.map((playerGuess, index) => {
    const opponentGuess = opponentPlayer?.guesses[index]
    const roundInfo = rounds?.[index]
    return {
      roundNumber: index + 1,
      country: roundInfo?.panorama?.countryCode || 'N/A',
      playerScore: playerGuess.score,
      opponentScore: opponentGuess?.score ?? 0,
      distance: playerGuess.distance
        ? `${(playerGuess.distance / 1000).toFixed(1)} km`
        : 'N/A',
      time: playerGuess.time ? `${playerGuess.time.toFixed(1)}s` : 'N/A',
      roundData: {
        actual: roundInfo?.panorama,
        myGuess: playerGuess,
        opponentGuess: opponentGuess,
        roundNumber: index + 1,
      }
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
              <TableRow 
                key={detail.roundNumber}
                onClick={() => onRoundSelect(detail.roundData)}
                className={cn(
                    'cursor-pointer',
                    selectedRound?.roundNumber === detail.roundNumber && 'bg-accent'
                )}>
                <TableCell className="font-medium">{detail.roundNumber}</TableCell>
                <TableCell>{detail.country}</TableCell>
                <TableCell className="text-right">{typeof detail.playerScore === 'number' ? detail.playerScore.toLocaleString() : 'N/A'}</TableCell>
                <TableCell className="text-right">{typeof detail.opponentScore === 'number' ? detail.opponentScore.toLocaleString() : 'N/A'}</TableCell>
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