'use client';

import { useForwarderPlanOrders } from '@/apis/saas/forwarder';
import { useForwarderExecutionCard } from '@/apis/saas/forwarder-execution';
import { ExecutionNumbersForm } from '@/app/(saas)/app/forwarder/_components/execution-numbers-form';
import { monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import { REQUEST_KIND_LABEL, latestOrder } from '@/app/(saas)/app/forwarder/_components/labels';
import { QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  ForwarderContainerExecutionT,
  ForwarderGensetInstructionT,
  ForwarderOrderT,
  ForwarderVgmItemT,
} from '@/types/saas-forwarder';

const kg = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}kg`;

const celsius = (value: number | null) => (value === null ? '–' : `${value}°C`);

const BOOKING_CHANGE_DETAIL: Partial<Record<ForwarderOrderT['requests'][number]['kind'], string>> =
  {
    booking_cancel: '컨테이너 1대 빼기',
    booking_new: '컨테이너 1대 추가',
  };

const AssumedChip = () => <span className="m2-chip m2-chip-warn">가정</span>;

export function ForwarderExecutionCard({ planId }: { planId: string }) {
  const card = useForwarderExecutionCard(planId);
  const orders = useForwarderPlanOrders(planId);
  const order = orders.data ? latestOrder(orders.data) : null;

  if (card.isPending) return <Skeleton className="mt-4 h-96 rounded-[18px]" />;

  if (card.isError) {
    return (
      <QueryError
        className="mt-4"
        message="실행 카드를 불러오지 못했습니다."
        onRetry={() => card.refetch()}
        isRetrying={card.isFetching}
      />
    );
  }

  const { containers, mock, mock_note: mockNote } = card.data;
  const gensets = card.data.genset_instructions ?? [];

  return (
    <section className="m2-card mt-4" aria-labelledby="forwarder-execution-card-title">
      <div className="m2-card-h">
        <div>
          <h2 id="forwarder-execution-card-title" className="m2-h2">
            컨테이너 실행 카드
          </h2>
          <div className="m2-sub">컨테이너마다 부킹·컨테이너·씰 번호, VGM, 설정과 마감</div>
        </div>
        {mock ? <span className="m2-chip m2-chip-warn">가상 번호 포함</span> : null}
      </div>

      {mock ? <div className="m2-note m2-note-warn mb-3">{mockNote}</div> : null}

      {containers.length === 0 ? (
        <p className="m2-sub">이 계획에는 실행할 컨테이너가 없습니다.</p>
      ) : (
        containers.map(container => (
          <ContainerExecutionBlock
            key={container.container_id}
            planId={planId}
            container={container}
          />
        ))
      )}

      <GensetSection gensets={gensets} />
      <RequestDocuments order={order} />
    </section>
  );
}

type ContainerExecutionBlockPropsT = {
  planId: string;
  container: ForwarderContainerExecutionT;
};

function ContainerExecutionBlock({ planId, container }: ContainerExecutionBlockPropsT) {
  const { setpoint, empty_pickup: pickup, cutoffs } = container;
  const gas = [
    setpoint.o2_pct === null ? null : `O₂ ${setpoint.o2_pct}%`,
    setpoint.co2_pct === null ? null : `CO₂ ${setpoint.co2_pct}%`,
  ].filter(Boolean);

  return (
    <article
      className="m2-block"
      aria-label={`${container.container_id} 실행 카드`}
      data-container-id={container.container_id}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m2-h3">
            {container.container_id} · {container.kind}
          </h3>
          <div className="m2-kv mt-0.5">
            <span className="m2-mono">{container.voyage_id}</span> {container.vessel_name} ·{' '}
            {container.terminal} · 로트 {container.lot_ids.join(', ') || '없음'}
          </div>
        </div>
      </div>

      <ExecutionNumbersForm planId={planId} container={container} />

      <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
        <dt className="text-m2-muted">설정</dt>
        <dd className="flex flex-wrap items-center gap-1.5">
          <span className="m2-num">
            {celsius(setpoint.set_temp_c)} (허용 {celsius(setpoint.temp_min_c)}~
            {celsius(setpoint.temp_max_c)})
          </span>
          <span>· 환기 {setpoint.ventilation}</span>
          {gas.length ? <span className="m2-num">· {gas.join(' · ')}</span> : null}
          {setpoint.assumed ? <AssumedChip /> : null}
        </dd>
        <dt className="text-m2-muted">공컨 픽업</dt>
        <dd className="flex flex-wrap items-center gap-1.5">
          {pickup.location}
          {pickup.assumed ? <AssumedChip /> : null}
        </dd>
        <dt className="text-m2-muted">마감</dt>
        <dd className="m2-num">
          SI {monthDayTime(cutoffs.si_cutoff)} · VGM {monthDayTime(cutoffs.vgm_cutoff)} · CY{' '}
          {monthDayTime(cutoffs.cy_cutoff)} · ETD {monthDayTime(cutoffs.etd)}
        </dd>
      </dl>

      <VgmTable container={container} />
    </article>
  );
}

const fallbackItems = (container: ForwarderContainerExecutionT): ForwarderVgmItemT[] => {
  const { weight } = container;

  return [
    { name: '화물 순중량', kg: weight.net_kg, assumed: false, source: weight.basis },
    { name: '파렛트·포장', kg: weight.pallet_packaging_kg, assumed: true, source: weight.basis },
    { name: '컨테이너 자중', kg: weight.container_tare_kg, assumed: true, source: weight.basis },
  ];
};

function VgmTable({ container }: { container: ForwarderContainerExecutionT }) {
  const { weight } = container;
  const items = weight.items?.length ? weight.items : fallbackItems(container);

  return (
    <div className="mt-3">
      <div className="m2-lbl mb-1">VGM 항목 · 파렛트 {weight.pallets}개</div>
      <div className="overflow-x-auto">
        <table className="m2-table" aria-label={`${container.container_id} VGM 항목`}>
          <thead>
            <tr>
              <th>항목</th>
              <th className="r">무게</th>
              <th>근거</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.name}>
                <td>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {item.name}
                    {item.assumed ? <AssumedChip /> : null}
                  </span>
                </td>
                <td className="r m2-num">{kg(item.kg)}</td>
                <td className="text-[12.5px] text-m2-muted">{item.source}</td>
              </tr>
            ))}
            <tr>
              <td className="font-semibold">VGM</td>
              <td className="r m2-num font-bold">{kg(weight.vgm_kg)}</td>
              <td className="text-[12.5px] text-m2-muted">화물 총중량 + 컨테이너 자중</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m2-sub mt-1.5">{weight.calculation || weight.basis}</p>
    </div>
  );
}

function GensetSection({ gensets }: { gensets: ForwarderGensetInstructionT[] }) {
  return (
    <div className="mt-4">
      <h3 className="m2-h3">배터리 젯셋 사전 배정</h3>
      {gensets.length === 0 ? (
        <p className="m2-sub">무전원 예상 시간이 기준을 넘는 운행이 없습니다.</p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1.5" aria-label="배터리 젯셋 사전 배정">
          {gensets.map(item => (
            <li
              key={item.key}
              className="rounded-xl bg-[rgba(15,27,51,.035)] px-3 py-2 text-[12.5px]"
            >
              <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                <span className="m2-chip m2-chip-navy">{item.equipment}</span>
                <span className="m2-num text-m2-muted">
                  무전원 예상 {Math.round(item.unpowered_minutes)}분 · 기준{' '}
                  {Math.round(item.threshold_minutes)}분
                </span>
              </div>
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestDocuments({ order }: { order: ForwarderOrderT | null }) {
  if (!order || order.requests.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="m2-h3">외부 요청 서류</h3>
      <ul className="mt-1.5 flex flex-col gap-1.5" aria-label="외부 요청 서류">
        {order.requests.map(request => (
          <li
            key={request.request_id}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-[rgba(15,27,51,.035)] px-3 py-2 text-[12.5px]"
          >
            {request.document_action_label ? (
              <span className="m2-chip m2-chip-brand">{request.document_action_label}</span>
            ) : (
              <b className="font-semibold">{REQUEST_KIND_LABEL[request.kind]}</b>
            )}
            {request.document_action === 'booking_change' && BOOKING_CHANGE_DETAIL[request.kind] ? (
              <span>{BOOKING_CHANGE_DETAIL[request.kind]}</span>
            ) : null}
            <span>{request.counterparty}</span>
            {request.container_id ? (
              <span className="m2-mono text-m2-muted">{request.container_id}</span>
            ) : null}
            <span className="m2-num text-m2-muted">회신 기한 {monthDayTime(request.deadline)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
