'use client';

import { useShipperQuantityStatements } from '@/apis/saas/quantity-reservations';
import { useShipperCatalog, useShipperLots, useShipperPlans } from '@/apis/saas/shipper';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtDay, fmtSignedWon, fmtWon } from '@/app/(saas)/app/shipper/_components/shipper-format';
import type { QuantityStatementRowT } from '@/types/saas-quantity';

export function QuantityStatementSection() {
  const query = useShipperQuantityStatements();
  const plans = useShipperPlans();
  const lots = useShipperLots();
  const catalog = useShipperCatalog();

  if (query.isPending) return <CardSkeleton height={200} />;
  if (query.isError)
    return (
      <QueryError
        message="수량 조정 운임 내역을 불러오지 못했습니다."
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  if (!query.data.length) return null;

  return (
    <section className="m2-card min-w-0" aria-label="취소·보충 운임 조정 내역">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">취소·보충 운임 조정</h2>
          <p className="m2-sub">
            취소 부담금과 보충·보상 크레딧의 계산 상태를 확인하세요. 플랫폼 성과보수와 구분되는 운임
            조정 항목입니다.
          </p>
        </div>
      </div>
      <div className="grid min-w-0 gap-4">
        {query.data.map(row => {
          const plan = plans.data?.find(item => item.plan_id === row.plan_id);
          const lot = lots.data?.find(item => item.id === row.lot_id);
          const product = lot
            ? catalog.data?.products.find(item => item.id === lot.product_id)
            : null;
          const lotName = lot
            ? `${product?.name ?? lot.product_id} · ${fmtDay(lot.ready_date)}`
            : '출하 조정 내역';

          return (
            <article
              key={`${row.plan_id}:${row.voyage_id}:${row.lot_id}`}
              className="min-w-0 rounded-xl border border-m2-line p-4"
            >
              <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold break-words">{lotName}</h3>
                  <p className="mt-1 text-xs break-words text-m2-muted">
                    {plan?.vessel ?? '참여 항차'} · {row.voyage_id}
                  </p>
                  <p className="mt-1 text-xs break-all text-m2-muted">출하 {row.lot_id}</p>
                </div>
                <span className={`m2-chip ${row.finalized ? 'm2-chip-ok' : ''}`}>
                  {row.finalized ? '계산 확정' : '예상'}
                </span>
              </div>
              <dl className="grid min-w-0 gap-3">
                <StatementLine label="취소 부담금" amount={row.cancellation_charge_krw} />
                <StatementLine label="보충 크레딧" amount={row.refill_credit_krw} />
                <StatementLine label="보상 운임 크레딧" amount={row.compensation_credit_krw} />
                <div className="mt-1 flex min-w-0 flex-wrap items-start justify-between gap-2 border-t border-m2-line pt-3 text-sm">
                  <dt className="font-semibold">운임 조정액</dt>
                  <dd className="m2-num font-bold">{fmtSignedWon(row.net_adjustment_krw)}</dd>
                </div>
              </dl>
              <p className="m2-sub mt-3 text-xs">
                {row.finalized
                  ? '포워더의 출항 확인을 반영해 확정한 계산액입니다.'
                  : '출항 확인 전 예상 조정액이며 보충·보상 내역에 따라 바뀔 수 있습니다.'}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatementLine({
  label,
  amount,
}: {
  label: string;
  amount: QuantityStatementRowT['cancellation_charge_krw'];
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 text-sm">
      <dt className="text-m2-muted">{label}</dt>
      <dd className="m2-num font-semibold">{fmtWon(amount)}</dd>
    </div>
  );
}
