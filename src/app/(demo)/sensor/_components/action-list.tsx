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
          <ol className="flex flex-col">
            {actions.map(({ key, severity, title, description, triggered_at, request }) => (
              <li key={key} className="grid grid-cols-[3.5rem_1rem_1fr] gap-x-3">
                <span className="pt-0.5 text-sm font-bold num text-muted-foreground">
                  {formatMonthDayTime(triggered_at).slice(-5)}
                </span>
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      'mt-1.5 size-3 shrink-0 rounded-full',
                      severity === 'critical' ? 'bg-berry' : 'bg-air'
                    )}
                  />
                  <span className="w-px flex-1 bg-line" />
                </span>
                <div className="pb-5">
                  <p className="font-bold">{title.replace(/^CA-\d+\s*/, '')}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  {request && (
                    <p className="mt-1 text-sm text-navy">{request.counterparty}에 요청</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
