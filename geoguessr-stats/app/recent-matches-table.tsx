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
    },
    {
      accessorKey: 'mapName',
      header: 'Map',
      cell: (row) => row.options?.map?.name ?? 'Unknown Map',
    },
    {
      accessorKey: 'outcome',
      header: 'Result',
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
