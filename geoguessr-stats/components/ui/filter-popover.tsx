'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter as FilterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPopoverProps<T> {
  columnId: keyof T;
  columnName: string;
  data: T[];
  activeFilters: (T[keyof T])[];
  onFilterChange: (columnId: keyof T, selectedValues: (T[keyof T])[]) => void;
}

export function FilterPopover<T>({
  columnId,
  columnName,
  data,
  activeFilters,
  onFilterChange,
}: FilterPopoverProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const uniqueValues = useMemo(() => {
    const values = new Set(data.map(item => item[columnId]));
    return Array.from(values);
  }, [data, columnId]);

  const [selectedValues, setSelectedValues] = useState<Set<T[keyof T]>>(new Set(activeFilters));

  const handleCheckboxChange = (value: T[keyof T]) => {
    const newSelectedValues = new Set(selectedValues);
    if (newSelectedValues.has(value)) {
      newSelectedValues.delete(value);
    } else {
      newSelectedValues.add(value);
    }
    setSelectedValues(newSelectedValues);
  };

  const applyFilters = () => {
    onFilterChange(columnId, Array.from(selectedValues));
    setIsOpen(false);
  };

  const clearFilters = () => {
    setSelectedValues(new Set());
    onFilterChange(columnId, []);
    setIsOpen(false);
  };

  const isFilterActive = activeFilters.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <FilterIcon className={cn("h-4 w-4", isFilterActive && "text-blue-500")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <div className="p-4">
          <h4 className="font-medium">Filter {columnName}</h4>
        </div>
        <ScrollArea className="h-64">
          <div className="p-4">
            {uniqueValues.map((value, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={`${String(columnId)}-${index}`}
                  checked={selectedValues.has(value)}
                  onCheckedChange={() => handleCheckboxChange(value)}
                />
                <label htmlFor={`${String(columnId)}-${index}`} className="text-sm">
                  {String(value)}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 border-t flex justify-between">
          <Button onClick={clearFilters} variant="ghost">Clear</Button>
          <Button onClick={applyFilters}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
