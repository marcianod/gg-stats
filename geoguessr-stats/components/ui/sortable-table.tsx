'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (row: T) => React.ReactNode;
  headerCell?: (header: string) => React.ReactNode;
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
  initialSortDirection?: 'ascending' | 'descending';
  onCellContextMenu?: (row: T, column: ColumnDef<T>) => React.ReactNode;
  rowsPerPage?: number;
}

export function SortableTable<T>({ columns, data, onRowClick, selectedRow, initialSortKey, initialSortDirection = 'descending', onCellContextMenu, rowsPerPage = 200 }: SortableTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({ key: initialSortKey, direction: initialSortDirection });
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [data]);

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

  const paginatedData = useMemo(() => {
    const start = currentPage * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const requestSort = (key: keyof T) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(0);
  };

  const getSortIndicator = (column: keyof T) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto">
        <Table className="text-sm border-collapse" style={{ width: '100%', tableLayout: 'auto' }}>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {columns.map((column, colIndex) => (
                <TableHead 
                  key={column.accessorKey as string} 
                  style={{ width: column.width }} 
                  className={cn(
                    column.className, 
                    "h-10 px-2 border-b border-r",
                    colIndex === columns.length - 1 && "border-r-0"
                  )}
                >
                  {column.headerCell ? (
                    column.headerCell(column.header)
                  ) : (
                    <Button variant="ghost" onClick={() => requestSort(column.accessorKey)} className="px-2 py-1 h-auto">
                      {column.header}
                      {getSortIndicator(column.accessorKey)}
                    </Button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow
                key={index}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  selectedRow === row && 'bg-accent',
                  "h-10"
                )}
              >
                {columns.map((column, colIndex) => (
                  <TableCell 
                    key={column.accessorKey as string} 
                    style={{ width: column.width }} 
                    className={cn(
                      column.className, 
                      "py-1 px-2 border-b border-r",
                      colIndex === columns.length - 1 && "border-r-0"
                    )}
                  >
                    <ContextMenu>
                      <ContextMenuTrigger className="w-full h-full text-left">
                        {column.cell ? column.cell(row) : (row[column.accessorKey] as React.ReactNode)}
                      </ContextMenuTrigger>
                      {onCellContextMenu && onCellContextMenu(row, column)}
                    </ContextMenu>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
