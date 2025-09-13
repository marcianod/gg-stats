'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table';

interface MockData {
  id: number;
  name: string;
  value: string;
}

const mockData: MockData[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  value: `Value ${i + 1}`,
}));

const columns: ColumnDef<MockData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    width: '20%',
  },
  {
    accessorKey: 'name',
    header: 'Name',
    width: '40%',
  },
  {
    accessorKey: 'value',
    header: 'Value',
    width: '40%',
  },
];

export default function PanelTestPage() {
  return (
    <div className="p-8 bg-muted/40 h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl h-[70vh] flex flex-col">
        <Card className="flex flex-col flex-grow overflow-hidden">
          <CardHeader>
            <CardTitle>Scrollable Panel Test</CardTitle>
            <CardDescription>This card content should be scrollable.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto">
            <SortableTable columns={columns} data={mockData} initialSortKey="id" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
