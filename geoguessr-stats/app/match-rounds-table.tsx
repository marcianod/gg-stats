'use client';

import { type RoundData } from '../lib/types';
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table';

interface MatchRoundsTableProps {
  rounds: RoundData[];
  onRoundSelect: (roundData: RoundData) => void;
  selectedRound: RoundData | null;
}

export function MatchRoundsTable({ rounds, onRoundSelect, selectedRound }: MatchRoundsTableProps) {
  const columns: ColumnDef<RoundData>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: (row) => row.date.toLocaleString(),
      className: 'w-[120px]',
    },
    {
      accessorKey: 'countryCode',
      header: 'Country',
      cell: (row) => row.countryCode.toUpperCase() || 'N/A',
    },
    {
      accessorKey: 'myGuess',
      header: 'My Score',
      cell: (row) => (typeof row.myGuess.score === 'number' ? row.myGuess.score.toLocaleString() : 'N/A'),
      className: 'text-right',
    },
    {
      accessorKey: 'opponentGuess',
      header: 'Opponent Score',
      cell: (row) => (typeof row.opponentGuess.score === 'number' ? row.opponentGuess.score.toLocaleString() : 'N/A'),
      className: 'text-right',
    },
    {
      accessorKey: 'distDelta',
      header: 'Distance',
      cell: (row) => (row.myGuess.distance ? `${(row.myGuess.distance / 1000).toFixed(1)} km` : 'N/A'),
      className: 'text-right',
    },
    {
      accessorKey: 'timeDelta',
      header: 'Time',
      cell: (row) => (row.myGuess.time ? `${row.myGuess.time.toFixed(1)}s` : 'N/A'),
      className: 'text-right',
    },
  ];

  return (
    <SortableTable
      columns={columns}
      data={rounds}
      onRowClick={onRoundSelect}
      selectedRow={selectedRound}
      initialSortKey="date"
    />
  );
}
