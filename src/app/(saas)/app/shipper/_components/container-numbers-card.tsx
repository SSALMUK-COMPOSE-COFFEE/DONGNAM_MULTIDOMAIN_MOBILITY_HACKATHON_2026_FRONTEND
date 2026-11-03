import { cn } from 'cn';

import { CARD_MAIN, CARD_TABLE } from '@/app/(saas)/app/shipper/_components/mobile';

type ContainerNumberRowT = {
  containerId: string;
  voyageId: string;
  containerNo: string;
  sealNo: string;
  containerNoMock: boolean;
  sealNoMock: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const textOf = (record: Record<string, unknown>, key: string) => {
  const value = record[key];

  return typeof value === 'string' ? value : '';
};

const toRow = (value: unknown): ContainerNumberRowT | null => {
  if (!isRecord(value)) return null;
  const containerId = textOf(value, 'container_id');
  if (!containerId) return null;
  const mock = value.mock === true;

  return {
    containerId,
    voyageId: textOf(value, 'voyage_id'),
    containerNo: textOf(value, 'container_no'),
    sealNo: textOf(value, 'seal_no'),
    containerNoMock: typeof value.container_no_mock === 'boolean' ? value.container_no_mock : mock,
    sealNoMock: typeof value.seal_no_mock === 'boolean' ? value.seal_no_mock : mock,
  };
};

export const containerNumbersOf = (session: unknown): ContainerNumberRowT[] | null => {
  if (!isRecord(session) || !Array.isArray(session.container_numbers)) return null;

  return session.container_numbers.flatMap(item => toRow(item) ?? []);
};

function NumberCell({ value, mock }: { value: string; mock: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="m2-mono font-semibold break-all">{value || '–'}</span>
      {mock && value ? (
        <span className="m2-chip m2-chip-warn" title="포워더가 실제 번호를 넣기 전의 가상 번호">
          모의
        </span>
      ) : null}
    </span>
  );
}

export function ContainerNumbersCard({ session }: { session: unknown }) {
  const rows = containerNumbersOf(session);
  if (!rows || rows.length === 0) return null;

  const hasMock = rows.some(({ containerNoMock, sealNoMock }) => containerNoMock || sealNoMock);

  return (
    <section className="m2-card" aria-label="내 컨테이너 번호">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">내 화물이 실리는 컨테이너</h2>
          <p className="m2-sub">
            항구 반입·통관 서류에 쓰는 번호입니다. 다른 화주 컨테이너는 보이지 않습니다.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={cn('m2-table', CARD_TABLE)}>
          <thead>
            <tr>
              <th>컨테이너</th>
              <th>컨테이너 번호</th>
              <th>씰 번호</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.containerId}>
                <td className={CARD_MAIN}>
                  <div className="m2-who">
                    {row.containerId}
                    {row.voyageId ? <small className="m2-num">{row.voyageId}</small> : null}
                  </div>
                </td>
                <td>
                  <NumberCell value={row.containerNo} mock={row.containerNoMock} />
                </td>
                <td>
                  <NumberCell value={row.sealNo} mock={row.sealNoMock} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMock ? (
        <p className="m2-sub mt-2 text-[12px]">
          &lsquo;모의&rsquo; 번호는 포워더가 실제 번호를 넣으면 바뀝니다.
        </p>
      ) : null}
    </section>
  );
}
