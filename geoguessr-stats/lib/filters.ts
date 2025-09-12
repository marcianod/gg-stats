import { type ProcessedDuel } from '@/lib/types';

export interface Filter {
  id: number;
  field: string;
  condition: string;
  value: string;
}

export function applyFilters(data: ProcessedDuel[], filters: Filter[]): ProcessedDuel[] {
  if (filters.length === 0) {
    return data;
  }

  return data.filter((duel) => {
    return filters.every((filter) => {
      switch (filter.field) {
        case 'Map':
          return duel.options?.map?.name === filter.value;
        case 'Outcome':
          return duel.outcome === filter.value;
        default:
          return true;
      }
    });
  });
}
