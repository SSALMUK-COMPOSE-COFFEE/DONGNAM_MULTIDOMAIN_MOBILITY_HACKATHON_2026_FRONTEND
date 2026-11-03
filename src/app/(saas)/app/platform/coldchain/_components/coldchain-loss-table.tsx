import type { ColdchainLossT } from '@/apis/saas/coldchain';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import type { SettlementPreviewT } from '@/types/saas-analysis';
import { formatPercent } from '@/utils/format';

const signedWon = (krw: number) => (krw > 0 ? `+${won(krw)}` : won(krw));

type ColdchainLossTablePropsT = {
  loss: ColdchainLossT;
  preview: SettlementPreviewT | null;
};

export function ColdchainLossTable({ loss, preview }: ColdchainLossTablePropsT) {
  const lots = loss.lots ?? [];
  const shippers = loss.shippers ?? [];
  const shipperName = (shipperId: string) =>
    shippers.find(({ shipper_id }) => shipper_id === shipperId)?.shipper_name ?? shipperId;
  const refundOf = (lotId: string) => preview?.lots.find(({ lot_id }) => lot_id === lotId) ?? null;

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <h2 className="m2-h2">로트·화주별 추가 손실</h2>
        {typeof loss.cargo_value === 'number' ? (
          <span className="m2-chip m2-num">화물 가치 {won(loss.cargo_value)}</span>
        ) : null}
      </div>
      {lots.length === 0 ? (
        <p className="m2-sub">이 컨테이너에 손실을 나눌 로트가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="overflow-x-auto">
            <table className="m2-table">
              <thead>
                <tr>
                  <th>로트 · 화주</th>
                  <th className="r">파렛트</th>
                  <th className="r">계획 손실</th>
                  <th className="r">예상 손실</th>
                  <th className="r">추가 손실</th>
                  {preview ? <th className="r">성과보수 차감</th> : null}
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => {
                  const refund = refundOf(lot.lot_id);

                  return (
                    <tr key={lot.lot_id} className="m2-num">
                      <td>
                        <span className="m2-mono text-[12.5px]">{lot.lot_id}</span>
                        <div className="text-[11.5px] text-m2-muted">
                          {shipperName(lot.shipper_id)}
                        </div>
                      </td>
                      <td className="r">{lot.pallets}</td>
                      <td className="r">
                        {won(lot.planned_loss_krw)}
                        <div className="text-[11.5px] text-m2-muted">
                          {formatPercent(lot.planned_loss_rate)}
                        </div>
                      </td>
                      <td className="r">
                        {won(lot.predicted_loss_krw)}
                        <div className="text-[11.5px] text-m2-muted">
                          {formatPercent(lot.predicted_loss_rate)}
                        </div>
                      </td>
                      <td className="r font-semibold text-m2-berry-ink">
                        {signedWon(lot.delta_krw)}
                      </td>
                      {preview ? (
                        <td className="r">
                          {refund ? won(refund.refund_change) : '–'}
                          {refund?.capped ? (
                            <div className="text-[11.5px] text-m2-muted">상한 적용</div>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shippers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="m2-table">
                <thead>
                  <tr>
                    <th>화주</th>
                    <th className="r">로트</th>
                    <th className="r">화물 가치</th>
                    <th className="r">계획 손실</th>
                    <th className="r">예상 손실</th>
                    <th className="r">추가 손실</th>
                  </tr>
                </thead>
                <tbody>
                  {shippers.map(shipper => (
                    <tr key={shipper.shipper_id} className="m2-num">
                      <td>{shipper.shipper_name}</td>
                      <td className="r">{shipper.lot_ids.length}개</td>
                      <td className="r text-m2-muted">{won(shipper.lot_value)}</td>
                      <td className="r">{won(shipper.planned_loss_krw)}</td>
                      <td className="r">{won(shipper.predicted_loss_krw)}</td>
                      <td className="r font-semibold text-m2-berry-ink">
                        {signedWon(shipper.delta_krw)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {preview ? <p className="m2-note">{preview.note}</p> : null}
        </div>
      )}
    </section>
  );
}
