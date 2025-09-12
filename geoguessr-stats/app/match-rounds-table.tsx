import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table'
import { type RoundData } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button';

interface MatchRoundsTableProps {
  rounds: RoundData[]; // Changed from duel: ProcessedDuel;
  onRoundSelect: (roundData: RoundData) => void;
  selectedRound: RoundData | null;
}

const INITIAL_VISIBLE_ROUNDS = 5;

/**
 * Displays a table with a round-by-round breakdown of a duel.
 */
export function MatchRoundsTable({ rounds, onRoundSelect, selectedRound }: MatchRoundsTableProps) {
  const [visibleRounds, setVisibleRounds] = useState(INITIAL_VISIBLE_ROUNDS);
  
  const roundDetails = rounds.map((round) => { // Iterate directly over rounds
    return {
      roundNumber: round.roundNumber,
      country: round.countryCode.toUpperCase() || 'N/A', // Use countryCode from RoundData
      playerScore: round.myGuess.score, // Use score from RoundData
      opponentScore: round.opponentGuess.score, // Use score from RoundData
      distance: round.myGuess.distance
        ? `${(round.myGuess.distance / 1000).toFixed(1)} km`
        : 'N/A',
      time: round.myGuess.time ? `${round.myGuess.time.toFixed(1)}s` : 'N/A',
      roundData: round, // Pass the whole RoundData object
    }
  })

  const handleShowMore = () => {
    setVisibleRounds(prev => prev + 5);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Round Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
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
            {roundDetails?.slice(0, visibleRounds).map(detail => (
              <TableRow 
                key={`${detail.roundData.duelId}-${detail.roundNumber}`}
                onClick={() => detail.roundData && onRoundSelect(detail.roundData)}
                className={cn(
                    detail.roundData && 'cursor-pointer',
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
          {rounds.length > visibleRounds && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Button onClick={handleShowMore}>Show More</Button>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  )
}