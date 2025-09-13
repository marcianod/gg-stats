export type FilterType = 'include' | 'exclude';

export interface Filter<T> {
  id: keyof T;
  value: (string | number | boolean | Date | undefined)[];
  type: FilterType;
}

export function applyFilters<T>(data: T[], filters: Filter<T>[]): T[] {
  if (filters.length === 0) {
    return data;
  }

  return data.filter(item => {
    return filters.every(filter => {
      const itemValue = item[filter.id] as string | number | boolean | Date | undefined;
      
      if (filter.type === 'include') {
        return filter.value.includes(itemValue);
      }
      
      if (filter.type === 'exclude') {
        return !filter.value.includes(itemValue);
      }

      return true; // Should not happen
    });
  });
}
