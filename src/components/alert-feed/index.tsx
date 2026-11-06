import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AlertT } from '@/types/api';
import { formatMonthDayTime, withoutContainerPrefix } from '@/utils/format';

const LEVEL_STYLE: Record<AlertT['level'], string> = {
  critical: 'text-berry',
  warning: 'text-foreground',
  info: 'text-ok',
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
            <ul className="flex flex-col divide-y divide-line pr-3">
              {alerts.map(({ seq, level, title, message, at }) => (
                <li key={seq} className="grid grid-cols-[3.5rem_1fr] gap-x-3 py-3">
                  <span className="text-sm font-bold num text-muted-foreground">
                    {formatMonthDayTime(at).slice(-5)}
                  </span>
                  <div>
                    <p className={cn('font-bold', LEVEL_STYLE[level])}>
                      {withoutContainerPrefix(title)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
