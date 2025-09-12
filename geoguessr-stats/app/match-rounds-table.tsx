import { useState, useMemo } from 'react';
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
import { ArrowUpDown } from 'lucide-react';

type SortableColumn = 'date' | 'country' | 'playerScore' | 'opponentScore' | 'distance' | 'time';

interface SortConfig {
  key: SortableColumn;
  direction: 'ascending' | 'descending';
}

interface MatchRoundsTableProps {
  rounds: RoundData[]; // Changed from duel: ProcessedDuel;
  onRoundSelect: (roundData: RoundData) => void;
  selectedRound: RoundData | null;
}

const INITIAL_VISIBLE_ROUNDS = 100;

/**
 * Displays a table with a round-by-round breakdown of a duel.
 */
export function MatchRoundsTable({ rounds, onRoundSelect, selectedRound }: MatchRoundsTableProps) {
  const [visibleRounds, setVisibleRounds] = useState(INITIAL_VISIBLE_ROUNDS);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' }); // Default sort by date descending

  const roundDetails = useMemo(() => {
    const details = rounds.map((round) => { // Iterate directly over rounds
      return {
        date: round.date, // Use date from RoundData
        country: round.countryCode.toUpperCase() || 'N/A', // Use countryCode from RoundData
        playerScore: round.myGuess.score, // Use score from RoundData
        opponentScore: round.opponentGuess.score, // Use score from RoundData
        distance: round.myGuess.distance,
        time: round.myGuess.time,
        roundData: round, // Pass the whole RoundData object
      }
    });

    if (sortConfig.key) {
      details.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return details;
  }, [rounds, sortConfig]);

  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (column: SortableColumn) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
  };

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
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[120px]">
                <Button variant="ghost" onClick={() => requestSort('date')}>
                  Date{getSortIndicator('date')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('country')}>
                  Country{getSortIndicator('country')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('playerScore')}>
                  My Score{getSortIndicator('playerScore')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('opponentScore')}>
                  Opponent Score{getSortIndicator('opponentScore')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('distance')}>
                  Distance{getSortIndicator('distance')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('time')}>
                  Time{getSortIndicator('time')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roundDetails?.slice(0, visibleRounds).map(detail => (
              <TableRow 
                key={`${detail.roundData.duelId}-${detail.date.getTime()}`}
                onClick={() => detail.roundData && onRoundSelect(detail.roundData)}
                className={cn(
                    detail.roundData && 'cursor-pointer',
                    selectedRound?.duelId === detail.roundData.duelId && selectedRound?.date.getTime() === detail.date.getTime() && 'bg-accent'
                )}>
                <TableCell className="font-medium">{detail.date.toLocaleDateString()}</TableCell>
                <TableCell>{detail.country}</TableCell>
                <TableCell className="text-right">{typeof detail.playerScore === 'number' ? detail.playerScore.toLocaleString() : 'N/A'}</TableCell>
                <TableCell className="text-right">{typeof detail.opponentScore === 'number' ? detail.opponentScore.toLocaleString() : 'N/A'}</TableCell>
                <TableCell className="text-right">{detail.distance ? `${(detail.distance / 1000).toFixed(1)} km` : 'N/A'}</TableCell>
                <TableCell className="text-right">{detail.time ? `${detail.time.toFixed(1)}s` : 'N/A'}</TableCell>
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
