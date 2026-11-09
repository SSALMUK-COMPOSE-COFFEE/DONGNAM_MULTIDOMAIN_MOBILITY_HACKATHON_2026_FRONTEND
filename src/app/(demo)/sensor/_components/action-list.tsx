import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TwinStateT } from '@/types/api';
import { formatMonthDayTime } from '@/utils/format';

type ActionListPropsT = { actions: TwinStateT['actions'] };

export function ActionList({ actions }: ActionListPropsT) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>자동 조치</span>
            <Badge variant="secondary" className="num">
              {actions.length}건
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">초과 단전 발생 시 즉시 요청</span>
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            허용 단전 시간(가정) 이내이거나 아직 실행된 자동 조치가 없습니다.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {actions.map(({ key, severity, title, description, triggered_at, request }) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-line bg-panel px-4 py-3"
              >
                <span
                  className={cn(
                    'mt-1.5 size-2.5 shrink-0 rounded-full',
                    severity === 'critical' ? 'bg-berry' : 'bg-air'
                  )}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-navy">{title.replace(/^CA-\d+\s*/, '')}</p>
                    <span className="text-xs font-bold num text-muted-foreground">
                      {formatMonthDayTime(triggered_at).slice(-5)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  {request && (
                    <Badge variant="outline" className="mt-2 border-line bg-white text-navy">
                      {request.counterparty}에 요청
                    </Badge>
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
