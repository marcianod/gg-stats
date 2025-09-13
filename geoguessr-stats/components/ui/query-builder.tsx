'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilterPill } from '@/components/ui/filter-pill';
import { PlusCircle } from 'lucide-react';
import { Filter } from '@/lib/filters';
import { ProcessedDuel } from '@/lib/types';

interface QueryBuilderProps {
  setFilters: (filters: Filter<ProcessedDuel>[]) => void;
}

export function QueryBuilder({ setFilters }: QueryBuilderProps) {
  const [internalFilters, setInternalFilters] = useState<Filter<ProcessedDuel>[]>([]);

  const addFilter = () => {
    // This is a simplified example. A real implementation would have a UI for creating filters.
    const newFilter: Filter<ProcessedDuel> = {
      id: 'mapName',
      value: ['A Community World'],
      type: 'include',
    };
    
    const newFilters = [...internalFilters.filter(f => f.id !== newFilter.id), newFilter];
    setInternalFilters(newFilters);
    setFilters(newFilters);
  };

  const removeFilter = (id: keyof ProcessedDuel) => {
    const newFilters = internalFilters.filter((filter) => filter.id !== id);
    setInternalFilters(newFilters);
    setFilters(newFilters);
  };

  return (
    <div className="flex items-center gap-2">
      {internalFilters.map((filter) => (
        <FilterPill
          key={filter.id as string}
          field={filter.id as string}
          condition={filter.type}
          value={filter.value.join(', ')}
          onRemove={() => removeFilter(filter.id)}
        />
      ))}
      <Button variant="ghost" size="sm" onClick={addFilter}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Filter
      </Button>
    </div>
  );
}
