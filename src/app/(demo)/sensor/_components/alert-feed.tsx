import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AlertT } from '@/types/api';
import { formatMonthDayTime } from '@/utils/format';

const LEVEL_STYLE: Record<AlertT['level'], { text: string; dot: string }> = {
  critical: { text: 'text-berry', dot: 'bg-berry' },
  warning: { text: 'text-navy', dot: 'bg-air' },
  info: { text: 'text-ok', dot: 'bg-ok' },
};

export function AlertFeed({ alerts }: { alerts: AlertT[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>실시간 알림</span>
            <Badge variant="secondary" className="num">
              {alerts.length}건
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">주의·허용 시간(가정) 기준</span>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 알림이 없습니다.</p>
        ) : (
          <ScrollArea className="h-60">
            <ul className="flex flex-col divide-y divide-line pr-3">
              {alerts.map(({ seq, level, title, message, at }) => {
                const style = LEVEL_STYLE[level];
                return (
                  <li key={seq} className="grid grid-cols-[3.5rem_1fr] gap-x-3 py-2.5">
                    <span className="pt-0.5 text-sm font-bold num text-muted-foreground">
                      {formatMonthDayTime(at).slice(-5)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn('size-2 shrink-0 rounded-full', style.dot)} />
                        <p className={cn('font-bold', style.text)}>
                          {title.replace(/^CA-\d+\s*/, '')}
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
