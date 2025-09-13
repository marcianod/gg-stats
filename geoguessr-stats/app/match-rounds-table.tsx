'use client';

import { type RoundData } from '../lib/types';
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table';
import { getFlagEmoji } from '@/lib/utils';

interface MatchRoundsTableProps {
  rounds: RoundData[];
  onRoundSelect: (roundData: RoundData) => void;
  selectedRound: RoundData | null;
  viewMode: 'matches' | 'countries';
}

export function MatchRoundsTable({ rounds, onRoundSelect, selectedRound, viewMode }: MatchRoundsTableProps) {
  const columns: ColumnDef<RoundData>[] = [
    viewMode === 'matches'
      ? {
          accessorKey: 'roundNumber',
          header: 'R',
          cell: (row) => row.roundNumber,
        }
      : {
          accessorKey: 'date',
          header: 'Date',
          cell: (row) => row.date.toLocaleDateString(),
        },
    {
      accessorKey: 'countryCode',
      header: 'Country',
      cell: (row) => (
        <div className="flex items-center">
          <span className="mr-2">{getFlagEmoji(row.countryCode)}</span>
          <span>{row.countryCode.toUpperCase()}</span>
        </div>
      ),
    },
    {
      accessorKey: 'gameMode',
      header: 'Mode',
    },
    {
      accessorKey: 'scoreDelta',
      header: 'Score',
      cell: (row) => (
        <div className="flex items-baseline text-sm">
          <span>{row.myGuess.score.toLocaleString()}</span>
          <span className={`ml-1 text-xs ${row.scoreDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({row.scoreDelta >= 0 ? '+' : ''}{row.scoreDelta.toLocaleString()})
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'distDelta',
      header: 'Distance',
      cell: (row) => (
        <div className="flex items-baseline text-sm">
          <span>{(row.myGuess.distance / 1000).toFixed(1)}km</span>
          <span className={`ml-1 text-xs ${row.distDelta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({row.distDelta <= 0 ? '' : '+'}{(row.distDelta / 1000).toFixed(1)}km)
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'multiplier',
      header: 'X',
      cell: (row) => row.multiplier?.toFixed(1) ?? 'N/A',
    },
    {
      accessorKey: 'damage',
      header: 'Dmg',
      cell: (row) => (
        <div className={`${row.damage && row.damage > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {row.damage?.toLocaleString() ?? 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'timeDelta',
      header: 'Time',
      cell: (row) => (
        <div className="flex items-baseline text-sm">
          <span>{row.myGuess.time.toFixed(1)}s</span>
          <span className={`ml-1 text-xs ${row.timeDelta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({row.timeDelta <= 0 ? '' : '+'}{row.timeDelta.toFixed(1)}s)
          </span>
        </div>
      ),
    },
  ];

  return (
    <SortableTable
      columns={columns}
      data={rounds}
      onRowClick={onRoundSelect}
      selectedRow={selectedRound}
      initialSortKey={viewMode === 'matches' ? 'roundNumber' : 'date'}
      initialSortDirection={viewMode === 'matches' ? 'ascending' : 'descending'}
    />
  );
}
