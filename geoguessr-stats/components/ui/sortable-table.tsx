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
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  width?: string;
}

interface SortConfig<T> {
  key: keyof T;
  direction: 'ascending' | 'descending';
}

interface SortableTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedRow?: T | null;
  initialSortKey: keyof T;
}

export function SortableTable<T>({ columns, data, onRowClick, selectedRow, initialSortKey }: SortableTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({ key: initialSortKey, direction: 'descending' });

  const sortedData = useMemo(() => {
    const sortableData = [...data];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (column: keyof T) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
  };

  return (
    <div className="relative h-full overflow-y-auto flex flex-col">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.accessorKey as string} style={{ width: column.width }} className={column.className}>
                <Button variant="ghost" onClick={() => requestSort(column.accessorKey)}>
                  {column.header}
                  {getSortIndicator(column.accessorKey)}
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && 'cursor-pointer',
                selectedRow === row && 'bg-accent'
              )}
            >
              {columns.map((column) => (
                <TableCell key={column.accessorKey as string} style={{ width: column.width }} className={column.className}>
                  {column.cell ? column.cell(row) : (row[column.accessorKey] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
