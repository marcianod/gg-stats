'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterPillProps {
  field: string;
  condition: string;
  value: string;
  onRemove: () => void;
}

export function FilterPill({ field, condition, value, onRemove }: FilterPillProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
      <span>{field}</span>
      <span className="font-semibold">{condition}</span>
      <span>{value}</span>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
