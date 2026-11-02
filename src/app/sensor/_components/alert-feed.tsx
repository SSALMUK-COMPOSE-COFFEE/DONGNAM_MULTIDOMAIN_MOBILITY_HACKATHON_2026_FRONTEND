import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AlertT } from '@/types/api';

const LEVEL_STYLE: Record<string, string> = {
  critical: 'border-berry bg-berry-soft',
  warning: 'border-air bg-air-soft',
};

export function AlertFeed({ alerts }: { alerts: AlertT[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>알림</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 알림이 없습니다.</p>
        ) : (
          <ScrollArea className="h-120">
            <ul className="flex flex-col gap-2 pr-3">
              {alerts.map(({ seq, level, title, message }) => (
                <li
                  key={seq}
                  className={cn('rounded-lg border-l-4 bg-panel p-3', LEVEL_STYLE[level])}
                >
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
