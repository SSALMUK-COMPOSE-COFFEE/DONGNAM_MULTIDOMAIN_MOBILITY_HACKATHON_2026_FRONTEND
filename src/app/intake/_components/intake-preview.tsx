import { cn } from 'cn';
import { CheckIcon, PlaneIcon, ShipIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IntakePreviewT } from '@/types/api';
import { formatMonthDay, formatMonthDayTime } from '@/utils/format';

type IntakePreviewPropsT = {
  preview: IntakePreviewT | null;
};

/** 등록 즉시 보여주는 결과: 자동으로 채운 값, 실을 수 있는 배, 항공 가능 여부, 혼적 경고 */
export function IntakePreview({ preview }: IntakePreviewPropsT) {
  if (!preview) {
    return (
      <Card className="justify-center">
        <CardContent className="py-16 text-center text-lg text-muted-foreground">
          등록하면 실을 수 있는 배와 항공 가능 여부를 바로 알려줍니다
        </CardContent>
      </Card>
    );
  }

  const { lot, resolved, defaults_applied, hints } = preview;
  const earliestContainerId = hints.earliest_feasible?.container_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {resolved.shipper_name}
          <Badge variant="secondary">미리보기</Badge>
        </CardTitle>
        <CardDescription>
          {resolved.product_name} <span className="num">{lot.pallets}</span>파렛트 ·{' '}
          {resolved.packhouse_name} → {resolved.destination_name} · 출하{' '}
          <span className="num">{formatMonthDay(lot.ready_date)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-sm text-muted-foreground">판매기한 (자동)</p>
            <p className="text-2xl font-bold num">{formatMonthDay(lot.sell_by_date)}</p>
          </div>
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-sm text-muted-foreground">로트 번호 (자동)</p>
            <p className="text-lg font-bold num break-all">{lot.id}</p>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 font-bold">
            <ShipIcon className="size-4 text-sea" />
            해상
          </h3>
          {hints.sea_options.map(
            ({
              container_id,
              vessel_name,
              etd,
              arrival_date,
              feasible,
              reasons,
              pull_forward_days,
            }) => (
              <div
                key={container_id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3',
                  container_id === earliestContainerId && 'border-brand bg-brand-soft'
                )}
              >
                {feasible ? (
                  <CheckIcon className="size-5 text-ok" />
                ) : (
                  <XIcon className="size-5 text-berry" />
                )}
                <span className="font-bold">{container_id}</span>
                <span className="text-sm text-muted-foreground">{vessel_name}</span>
                <span className="ml-auto text-sm num">
                  출항 {formatMonthDayTime(etd)} · 도착 {formatMonthDay(arrival_date)}
                  {!!pull_forward_days && ` · ${pull_forward_days}일 당김`}
                </span>
                {container_id === earliestContainerId && (
                  <Badge className="bg-brand">가장 빠름</Badge>
                )}
                {!feasible && <span className="text-sm text-berry">{reasons.join(', ')}</span>}
              </div>
            )
          )}
        </section>

        <section className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <PlaneIcon className="size-4 text-air" />
          <span className="font-bold">항공</span>
          {hints.air.feasible ? (
            <span className="text-sm num">
              가능 · 도착 {formatMonthDay(hints.air.arrival_date)}
            </span>
          ) : (
            <span className="text-sm text-berry">{hints.air.reason}</span>
          )}
        </section>

        {hints.warnings.map(warning => (
          <p
            key={warning}
            className="flex gap-2 rounded-xl bg-berry-soft px-4 py-3 text-sm font-medium text-berry"
          >
            <TriangleAlertIcon className="size-4 shrink-0 translate-y-0.5" />
            {warning}
          </p>
        ))}

        <ul className="text-xs text-muted-foreground">
          {defaults_applied.map(text => (
            <li key={text}>· {text}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
