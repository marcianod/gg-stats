'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilterPill } from '@/components/ui/filter-pill';
import { PlusCircle } from 'lucide-react';

interface Filter {
  id: number;
  field: string;
  condition: string;
  value: string;
}

interface QueryBuilderProps {
  setFilters: (filters: Filter[]) => void;
}

export function QueryBuilder({ setFilters }: QueryBuilderProps) {
  const [internalFilters, setInternalFilters] = useState<Filter[]>([]);
  const [nextId, setNextId] = useState(1);

  const addFilter = () => {
    const newFilters = [...internalFilters, { id: nextId, field: 'Map', condition: 'is', value: 'A Community World' }];
    setInternalFilters(newFilters);
    setFilters(newFilters);
    setNextId(nextId + 1);
  };

  const removeFilter = (id: number) => {
    const newFilters = internalFilters.filter((filter) => filter.id !== id);
    setInternalFilters(newFilters);
    setFilters(newFilters);
  };

  return (
    <div className="flex items-center gap-2">
      {internalFilters.map((filter) => (
        <FilterPill
          key={filter.id}
          field={filter.field}
          condition={filter.condition}
          value={filter.value}
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
