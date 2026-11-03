import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';

type StatTilePropsT = {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
};

export function StatTile({ label, value, unit, note }: StatTilePropsT) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <p className="text-4xl font-black num text-navy">
          {value}
          {unit && <span className="ml-1 text-lg font-bold text-muted-foreground">{unit}</span>}
        </p>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
