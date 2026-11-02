import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AlertT } from '@/types/api';
import { formatMonthDayTime } from '@/utils/format';

const LEVEL_STYLE: Record<AlertT['level'], string> = {
  critical: 'border-berry',
  warning: 'border-air',
  info: 'border-ok',
};

/** 실시간 알림(SSE). 최신 알림이 위로 온다 */
export function AlertFeed({ alerts }: { alerts: AlertT[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>실시간 알림</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 알림이 없습니다.</p>
        ) : (
          <ScrollArea className="h-96">
            <ul className="flex flex-col gap-2 pr-3">
              {alerts.map(({ seq, level, title, message, at }) => (
                <li
                  key={seq}
                  className={cn('rounded-xl border-l-4 bg-panel px-4 py-3', LEVEL_STYLE[level])}
                >
                  <p className="flex items-baseline justify-between gap-3 text-sm font-bold">
                    {title}
                    <span className="shrink-0 text-xs font-medium num text-muted-foreground">
                      {formatMonthDayTime(at)}
                    </span>
                  </p>
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
