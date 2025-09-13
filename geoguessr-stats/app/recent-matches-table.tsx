'use client';

import { type ProcessedDuel } from '@/lib/types';
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table';

interface RecentMatchesTableProps {
  duels: ProcessedDuel[];
  onDuelSelect: (duel: ProcessedDuel) => void;
  selectedDuel: ProcessedDuel | null;
}

export function RecentMatchesTable({ duels, onDuelSelect, selectedDuel }: RecentMatchesTableProps) {
  const columns: ColumnDef<ProcessedDuel>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: (row) => row.date.toLocaleDateString(),
      width: '25%',
    },
    {
      accessorKey: 'mapName',
      header: 'Map',
      cell: (row) => row.options?.map?.name ?? 'Unknown Map',
      width: '25%',
    },
    {
      accessorKey: 'gameMode',
      header: 'Mode',
      width: '15%',
    },
    {
      accessorKey: 'outcome',
      header: 'Result',
      cell: (row) => (
        <div className={`text-center font-bold ${row.outcome === 'Win' ? 'text-green-600' : 'text-red-600'}`}>
          {row.outcome}
        </div>
      ),
      width: '15%',
    },
    {
      accessorKey: 'mmr',
      header: 'MMR',
      cell: (row) => (
        <div className="text-right">
          <span>{row.mmr?.toFixed(0) ?? 'N/A'}</span>
          {row.mmrChange !== undefined && (
            <span className={`ml-1 text-xs ${row.mmrChange > 0 ? 'text-green-600' : row.mmrChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              ({row.mmrChange > 0 ? '+' : ''}{row.mmrChange.toFixed(0)})
            </span>
          )}
        </div>
      ),
      className: 'text-right',
      width: '20%',
    },
  ];

  return (
    <SortableTable
      columns={columns}
      data={duels}
      onRowClick={onDuelSelect}
      selectedRow={selectedDuel}
      initialSortKey="date"
    />
  );
}
