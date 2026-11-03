'use client';

import { cn } from 'cn';
import { TriangleAlertIcon } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { saasErrorReason } from '@/apis/saas/errors';
import {
  type ShipperIntakePreviewRequestT,
  useCreateShipperLot,
  useShipperIntakePreview,
} from '@/apis/saas/shipper';
import { todayIso } from '@/app/(saas)/app/shipper/_components/catalog';
import { SELL_WINDOW_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import { lotLabelFrom } from '@/app/(saas)/app/shipper/_components/lot-label';
import { plainWords, so2Text } from '@/app/(saas)/app/shipper/_components/plain-words';
import { errorStatus, toFieldErrors } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtDay } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { useDebouncedValue } from '@/app/(saas)/app/shipper/_components/use-now';
import { M2_COLORS } from '@/components/map-hero';
import type { ShipperCatalogT, ShipperLotPreviewT } from '@/types/saas-shipper';

type SellWindowT = keyof typeof SELL_WINDOW_LABEL;

type LotFormT = {
  product: string;
  pallets: number;
  ready_date: string;
  destination: string;
  shipper: string;
  sell_window: SellWindowT;
};

const PREVIEW_DEBOUNCE_MS = 500;
const DEFAULT_MAX_PALLETS = 99;

const destinationsOf = (catalog: ShipperCatalogT) => {
  const ids = new Set(catalog.voyages.map(({ destination }) => destination));

  return catalog.ports.filter(({ id }) => ids.has(id));
};

const shipperLabel = (catalog: ShipperCatalogT, shipperId: string) => {
  const shipper = catalog.shippers.find(({ id }) => id === shipperId);
  const packhouse = catalog.packhouses.find(({ id }) => id === shipper?.packhouse_id);
  if (!packhouse) return shipper?.name ?? '';

  return [packhouse.name, packhouse.region].filter(Boolean).join(' · ');
};

const initialFormOf = (catalog: ShipperCatalogT): LotFormT => ({
  product: catalog.products[0]?.id ?? '',
  pallets: 1,
  ready_date: todayIso(),
  destination: destinationsOf(catalog)[0]?.id ?? '',
  shipper: catalog.shippers[0]?.id ?? '',
  sell_window: 'normal',
});

const toRequest = (catalog: ShipperCatalogT, form: LotFormT): ShipperIntakePreviewRequestT => ({
  product: form.product,
  pallets: form.pallets,
  ready_date: form.ready_date,
  destination: form.destination,
  shipper: form.shipper,
  sell_by_date: null,
  sell_window: form.sell_window,
  scenario_id: catalog.id,
  plan_id: null,
  lot_id: null,
});

const isComplete = (form: LotFormT) =>
  !!form.product &&
  !!form.destination &&
  !!form.shipper &&
  /^\d{4}-\d{2}-\d{2}$/.test(form.ready_date) &&
  Number.isInteger(form.pallets) &&
  form.pallets >= 1;

function FormStep({
  index,
  label,
  htmlFor,
  error,
  children,
}: {
  index: number;
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-2.5">
      <span
        aria-hidden
        className="mt-[22px] grid size-[26px] place-items-center rounded-full bg-m2-brand-soft text-[12px] font-bold text-m2-brand-ink"
      >
        {index}
      </span>
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-semibold">
            {label}
          </label>
        ) : (
          <span className="mb-1.5 block text-[12.5px] font-semibold">{label}</span>
        )}
        {children}
        {error && <p className="mt-1 text-[12px] text-m2-crit">{error}</p>}
      </div>
    </div>
  );
}

const TOGGLE_CLASS =
  'inline-flex h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-[12px] border-0 bg-white px-2 font-semibold shadow-[0_0_0_1px_var(--m2-line-2)] transition-shadow duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none aria-pressed:text-m2-brand-ink aria-pressed:shadow-[0_0_0_2px_var(--m2-brand)]';

type ShipperLotFormPropsT = {
  catalog: ShipperCatalogT;
  onCreated?: (preview: ShipperLotPreviewT) => void;
  className?: string;
  id?: string;
};

export function ShipperLotForm({ catalog, onCreated, className, id }: ShipperLotFormPropsT) {
  const fieldId = useId();
  const [form, setForm] = useState<LotFormT>(() => initialFormOf(catalog));
  const update = (patch: Partial<LotFormT>) => setForm(prev => ({ ...prev, ...patch }));
  const createLot = useCreateShipperLot();

  const requestJson = isComplete(form) ? JSON.stringify(toRequest(catalog, form)) : '';
  const debouncedJson = useDebouncedValue(requestJson, PREVIEW_DEBOUNCE_MS);
  const previewRequest = useMemo(
    () => (debouncedJson ? (JSON.parse(debouncedJson) as ShipperIntakePreviewRequestT) : null),
    [debouncedJson]
  );
  const preview = useShipperIntakePreview(previewRequest);
  const previewData = requestJson ? preview.data : null;

  const submitErrors = toFieldErrors(createLot.error);
  const previewErrors = requestJson ? toFieldErrors(preview.error) : [];
  const fieldErrors = submitErrors.length > 0 ? submitErrors : previewErrors;
  const errorOf = (field: string) => fieldErrors.find(error => error.field === field)?.message;
  const otherErrors = fieldErrors
    .filter(
      ({ field }) =>
        !['product', 'pallets', 'ready_date', 'destination', 'shipper', 'sell_window'].includes(
          field
        )
    )
    .map(({ message }) => message);

  const product = catalog.products.find(({ id: productId }) => productId === form.product);
  const destinations = destinationsOf(catalog);
  const maxPallets = Math.max(
    ...catalog.containers.map(({ capacity_pallets }) => capacity_pallets),
    0
  );
  const palletLimit = maxPallets > 0 ? maxPallets : DEFAULT_MAX_PALLETS;
  const setPallets = (value: number) =>
    update({ pallets: Math.min(Math.max(Math.round(value) || 1, 1), palletLimit) });

  const earliest = previewData?.hints.earliest_feasible ?? null;
  const earliestCapacity = earliest
    ? catalog.containers.find(({ id: containerId }) => containerId === earliest.container_id)
        ?.capacity_pallets
    : null;
  const isChecking = preview.isFetching || requestJson !== debouncedJson;
  const previewFailed =
    !!requestJson && preview.isError && errorStatus(preview.error) !== 422 && !isChecking;

  const vesselText = () => {
    if (!requestJson) return '입력을 마치면 보여드려요';
    if (previewFailed) return '확인하지 못했습니다';
    if (!previewData) return isChecking ? '확인 중' : '–';
    if (!earliest) return '이 조건으로는 없음';
    const pull = earliest.pull_forward_days > 0 ? ` · ${earliest.pull_forward_days}일 당김` : '';

    return `${earliest.vessel_name} · ${fmtDay(earliest.etd)}${pull}`;
  };
  const containerText = () => {
    if (!earliest) return '–';
    if (typeof earliest.free_pallets === 'number') {
      return `${earliest.container_id} · 빈칸 ${earliest.free_pallets}`;
    }

    return typeof earliestCapacity === 'number'
      ? `${earliest.container_id} · ${earliestCapacity}파렛트 컨테이너`
      : earliest.container_id;
  };

  const onlyShipper = catalog.shippers.length <= 1;

  return (
    <section id={id} className={cn('m2-card scroll-mt-24', className)} aria-label="새 출하 등록">
      <h2 className="m2-h2">새 출하 등록</h2>
      <div className="m2-sub mb-3">다섯 가지만 알려주세요</div>

      <form
        className="flex flex-col gap-3.5"
        onSubmit={event => {
          event.preventDefault();
          createLot.mutate(toRequest(catalog, form), {
            onSuccess: created => {
              toast.success(
                `${lotLabelFrom(created.resolved.product_name, created.lot.ready_date, created.lot.pallets)} 출하를 등록했습니다.`
              );
              onCreated?.(created);
            },
            onError: error => {
              if (toFieldErrors(error).length === 0) {
                toast.error('출하를 등록하지 못했습니다.', {
                  description: saasErrorReason(error),
                });
              }
            },
          });
        }}
      >
        <FormStep index={1} label="품목" error={errorOf('product')}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="품목">
            {catalog.products.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={form.product === item.id}
                className={TOGGLE_CLASS}
                onClick={() => update({ product: item.id })}
              >
                <span
                  className="m2-dot"
                  style={{ background: item.so2_treated ? M2_COLORS.grape : M2_COLORS.berry }}
                />
                <span className="truncate">{so2Text(item.name)}</span>
              </button>
            ))}
          </div>
        </FormStep>

        <FormStep
          index={2}
          label={
            product
              ? `수량 (파렛트, 1파렛트 약 ${product.pallet_kg.toLocaleString('ko-KR')}kg)`
              : '수량 (파렛트)'
          }
          htmlFor={`${fieldId}-pallets`}
          error={errorOf('pallets')}
        >
          <div
            className={cn(
              'flex h-[42px] items-center rounded-[12px] bg-white shadow-[0_0_0_1px_var(--m2-line-2)]',
              errorOf('pallets') && 'shadow-[0_0_0_1.5px_var(--m2-crit)]'
            )}
          >
            <button
              type="button"
              aria-label="한 파렛트 줄이기"
              className="h-full w-11 flex-none border-0 bg-transparent text-[18px] text-m2-ink-2 disabled:opacity-40"
              disabled={form.pallets <= 1}
              onClick={() => setPallets(form.pallets - 1)}
            >
              −
            </button>
            <input
              id={`${fieldId}-pallets`}
              type="number"
              inputMode="numeric"
              min={1}
              max={palletLimit}
              value={form.pallets}
              aria-invalid={!!errorOf('pallets')}
              onChange={event => setPallets(Number(event.target.value))}
              className="m2-num h-full min-w-0 flex-1 [appearance:textfield] border-0 bg-transparent text-center text-[15px] font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="한 파렛트 늘리기"
              className="h-full w-11 flex-none border-0 bg-transparent text-[18px] text-m2-ink-2 disabled:opacity-40"
              disabled={form.pallets >= palletLimit}
              onClick={() => setPallets(form.pallets + 1)}
            >
              +
            </button>
          </div>
        </FormStep>

        <FormStep
          index={3}
          label="목적지"
          htmlFor={`${fieldId}-destination`}
          error={errorOf('destination')}
        >
          <select
            id={`${fieldId}-destination`}
            className="m2-inp w-full"
            value={form.destination}
            aria-invalid={!!errorOf('destination')}
            onChange={event => update({ destination: event.target.value })}
          >
            {destinations.map(port => (
              <option key={port.id} value={port.id}>
                {port.unlocode ? `${port.name} (${port.unlocode})` : port.name}
              </option>
            ))}
          </select>
        </FormStep>

        <FormStep
          index={4}
          label="출하 가능일"
          htmlFor={`${fieldId}-ready`}
          error={errorOf('ready_date')}
        >
          <input
            id={`${fieldId}-ready`}
            type="date"
            className="m2-inp m2-num w-full"
            value={form.ready_date}
            aria-invalid={!!errorOf('ready_date')}
            onChange={event => update({ ready_date: event.target.value })}
          />
        </FormStep>

        <FormStep
          index={5}
          label="선과장"
          htmlFor={onlyShipper ? '' : `${fieldId}-shipper`}
          error={errorOf('shipper')}
        >
          {onlyShipper ? (
            <div className="m2-inp flex w-full items-center text-m2-ink-2" aria-readonly>
              {shipperLabel(catalog, form.shipper)}
            </div>
          ) : (
            <select
              id={`${fieldId}-shipper`}
              className="m2-inp w-full"
              value={form.shipper}
              aria-invalid={!!errorOf('shipper')}
              onChange={event => update({ shipper: event.target.value })}
            >
              {catalog.shippers.map(shipper => (
                <option key={shipper.id} value={shipper.id}>
                  {shipperLabel(catalog, shipper.id)}
                </option>
              ))}
            </select>
          )}
        </FormStep>

        <details className="group rounded-[12px] bg-[rgba(15,27,51,.035)] px-3 py-2.5">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-m2-ink-2 select-none">
            추가 조건 · 판매 기간 {SELL_WINDOW_LABEL[form.sell_window]}
          </summary>
          <div className="mt-2.5 grid grid-cols-2 gap-2" role="group" aria-label="판매 기간">
            {(Object.keys(SELL_WINDOW_LABEL) as SellWindowT[]).map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={form.sell_window === value}
                className={TOGGLE_CLASS}
                onClick={() => update({ sell_window: value })}
              >
                판매 기간 {SELL_WINDOW_LABEL[value]}
              </button>
            ))}
          </div>
          {errorOf('sell_window') && (
            <p className="mt-1 text-[12px] text-m2-crit">{errorOf('sell_window')}</p>
          )}
        </details>

        <div className="m2-lines mt-0.5" aria-live="polite">
          <div>
            <span>이 조건으로 묶을 수 있는 배</span>
            <b className={cn(isChecking && 'text-m2-muted')}>{vesselText()}</b>
          </div>
          <div>
            <span>컨테이너</span>
            <b>{containerText()}</b>
          </div>
          {previewData && (
            <div>
              <span>항공</span>
              <b>
                {previewData.hints.air.feasible
                  ? `가능 · ${fmtDay(previewData.hints.air.arrival_date)} 도착`
                  : '불가'}
              </b>
            </div>
          )}
        </div>

        {(previewData?.hints.warnings.length ?? 0) > 0 && (
          <div className="m2-note m2-note-warn mt-0">
            <TriangleAlertIcon size={14} />
            <div>{plainWords(previewData?.hints.warnings.join(' · ') ?? '')}</div>
          </div>
        )}
        {otherErrors.length > 0 && (
          <p role="alert" className="text-[12px] text-m2-crit">
            {otherErrors.join(' · ')}
          </p>
        )}

        <button
          type="submit"
          className="m2-btn m2-btn-pri m2-btn-lg w-full"
          disabled={createLot.isPending || !isComplete(form)}
        >
          {createLot.isPending ? '등록 중' : '출하 등록'}
        </button>
        <div className="m2-sub mt-[-6px] text-center text-[12px]">
          계획에 들어가기 전까지 수정·취소할 수 있어요.
        </div>
      </form>
    </section>
  );
}
