import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TwinStateT } from '@/types/api';
import { formatMonthDayTime } from '@/utils/format';

type ActionListPropsT = { actions: TwinStateT['actions'] };

/** 단전 시간이 기준을 넘을 때마다 포워더가 보낼 요청이 하나씩 생긴다 */
export function ActionList({ actions }: ActionListPropsT) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>자동 조치</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 조치가 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {actions.map(({ key, severity, title, description, triggered_at, request }) => (
              <li
                key={key}
                className={cn(
                  'rounded-xl border-l-4 bg-panel px-4 py-3',
                  severity === 'critical' ? 'border-berry' : 'border-air'
                )}
              >
                <p className="flex items-baseline justify-between gap-3 font-bold">
                  {title}
                  <span className="shrink-0 text-xs font-medium num text-muted-foreground">
                    {formatMonthDayTime(triggered_at)}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                {request && <p className="mt-1.5 text-xs text-navy">→ {request.counterparty}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
