'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { type ProcessedDuel } from '@/lib/types';
import { cn } from '@/lib/utils';

type SortableColumn = 'date' | 'mapName' | 'outcome';

interface SortConfig {
  key: SortableColumn;
  direction: 'ascending' | 'descending';
}

interface RecentMatchesTableProps {
  duels: ProcessedDuel[];
  onDuelSelect: (duel: ProcessedDuel) => void;
  selectedDuel: ProcessedDuel | null;
}

export function RecentMatchesTable({ duels, onDuelSelect, selectedDuel }: RecentMatchesTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });

  const sortedDuels = useMemo(() => {
    const sortableDuels = [...duels];
    if (sortConfig.key) {
      sortableDuels.sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        if (sortConfig.key === 'mapName') {
          aValue = a.options?.map?.name ?? 'Unknown Map';
          bValue = b.options?.map?.name ?? 'Unknown Map';
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableDuels;
  }, [duels, sortConfig]);

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('date')}>
              Date{getSortIndicator('date')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('mapName')}>
              Map{getSortIndicator('mapName')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('outcome')}>
              Result{getSortIndicator('outcome')}
            </Button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedDuels.map((duel) => (
          <TableRow
            key={duel.gameId}
            onClick={() => onDuelSelect(duel)}
            className={cn(
              'cursor-pointer',
              selectedDuel?.gameId === duel.gameId && 'bg-accent'
            )}
          >
            <TableCell>{duel.date.toLocaleDateString()}</TableCell>
            <TableCell>{duel.options?.map?.name ?? 'Unknown Map'}</TableCell>
            <TableCell>{duel.outcome}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
