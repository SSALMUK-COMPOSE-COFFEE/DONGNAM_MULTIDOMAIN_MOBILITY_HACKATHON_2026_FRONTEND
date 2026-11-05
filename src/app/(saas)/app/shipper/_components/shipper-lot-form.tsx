'use client';

import { cn } from 'cn';
import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { saasErrorReason } from '@/apis/saas/errors';
import {
  type ShipperIntakePreviewRequestT,
  previewExpectedLossOf,
  useCreateShipperLot,
  useShipperIntakePreview,
} from '@/apis/saas/shipper';
import { useShipperProducts } from '@/apis/saas/shipper-products';
import { useShipperProfile } from '@/apis/saas/shipper-profile';
import { todayIso } from '@/app/(saas)/app/shipper/_components/catalog';
import { SELL_WINDOW_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import {
  lossBasisText,
  lossRateText,
} from '@/app/(saas)/app/shipper/_components/loss-disclosure-card';
import { lotLabelFrom } from '@/app/(saas)/app/shipper/_components/lot-label';
import { plainWords, so2Text } from '@/app/(saas)/app/shipper/_components/plain-words';
import { errorStatus, toFieldErrors } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtDay } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { ShipperPickupMap } from '@/app/(saas)/app/shipper/_components/shipper-pickup-map';
import { useDebouncedValue } from '@/app/(saas)/app/shipper/_components/use-now';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ShipperCatalogT, ShipperLotPreviewT } from '@/types/saas-shipper';

type SellWindowT = keyof typeof SELL_WINDOW_LABEL;

type LotFormT = {
  product: string;
  pallets: string;
  ready_date: string;
  destination: string;
  shipper: string;
  packhouse_id: string;
  sell_window: SellWindowT;
};

const PREVIEW_DEBOUNCE_MS = 500;
const DEFAULT_MAX_PALLETS = 20;

const destinationsOf = (catalog: ShipperCatalogT) => catalog.ports;

const initialDestinationOf = (catalog: ShipperCatalogT) =>
  catalog.ports.find(port => catalog.voyages.some(voyage => voyage.destination === port.id))?.id ??
  catalog.ports.find(port => port.unlocode && !port.unlocode.startsWith('KR'))?.id ??
  catalog.ports[0]?.id ??
  '';

const initialProductOf = (catalog: ShipperCatalogT, preferred: readonly string[]) =>
  preferred.find(productId => catalog.products.some(({ id }) => id === productId)) ??
  catalog.products[0]?.id ??
  '';

const initialFormOf = (catalog: ShipperCatalogT, preferred: readonly string[]): LotFormT => ({
  product: initialProductOf(catalog, preferred),
  pallets: '1',
  ready_date: todayIso(),
  destination: initialDestinationOf(catalog),
  shipper: catalog.shippers[0]?.id ?? '',
  packhouse_id: '',
  sell_window: 'normal',
});

const toRequest = (catalog: ShipperCatalogT, form: LotFormT): ShipperIntakePreviewRequestT => ({
  product: form.product,
  pallets: Number(form.pallets),
  ready_date: form.ready_date,
  destination: form.destination,
  shipper: form.shipper,
  packhouse_id: form.packhouse_id,
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
  !!form.packhouse_id &&
  /^\d{4}-\d{2}-\d{2}$/.test(form.ready_date) &&
  /^\d+$/.test(form.pallets.trim()) &&
  Number.isSafeInteger(Number(form.pallets)) &&
  Number(form.pallets) >= 1;

const palletErrorOf = (value: string, limit: number) => {
  if (!value.trim()) return '파렛트 수량을 입력하세요.';
  const count = Number(value);
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(count) || count < 1) {
    return '파렛트 수량은 1 이상의 정수로 입력하세요.';
  }
  if (count > limit) return `컨테이너 1대 용량(${limit}파렛트)을 넘습니다. 나눠서 등록하세요.`;

  return null;
};

const describedBy = (...ids: (string | false | null)[]) => {
  const value = ids.filter((item): item is string => !!item).join(' ');

  return value ? { 'aria-describedby': value } : {};
};

function FormStep({
  index,
  label,
  htmlFor,
  error,
  errorId,
  children,
}: {
  index: number;
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  errorId: string;
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
        {error && (
          <p id={errorId} className="mt-1 text-[12px] text-m2-crit">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const TOGGLE_CLASS =
  'inline-flex h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-[12px] border-0 bg-white px-2 font-semibold shadow-[0_0_0_1px_var(--m2-line-2)] transition-shadow duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none aria-pressed:text-m2-brand-ink aria-pressed:shadow-[0_0_0_2px_var(--m2-brand)]';

type ShipperLotFormPropsT = {
  catalog: ShipperCatalogT;
  onCreated?: (preview: ShipperLotPreviewT) => void;
  preferredProductIds?: readonly string[];
  className?: string;
  id?: string;
};

const NO_PREFERRED: readonly string[] = [];

export function ShipperLotForm({
  catalog,
  onCreated,
  preferredProductIds = NO_PREFERRED,
  className,
  id,
}: ShipperLotFormPropsT) {
  const fieldId = useId();
  const errorIdOf = (field: string) => `${fieldId}-${field}-error`;
  const warningsId = `${fieldId}-warnings`;
  const productsQuery = useShipperProducts();
  const profileQuery = useShipperProfile();
  const places = profileQuery.data?.packhouses ?? [];
  const availableProducts = productsQuery.data ?? [];
  const [draft, setForm] = useState<LotFormT>(() => initialFormOf(catalog, preferredProductIds));
  const form = {
    ...draft,
    packhouse_id: places.some(place => place.packhouse_id === draft.packhouse_id)
      ? draft.packhouse_id
      : (places.find(place => place.packhouse_id === profileQuery.data?.profile?.packhouse_id)
          ?.packhouse_id ??
        places[0]?.packhouse_id ??
        ''),
    product: availableProducts.some(item => item.id === draft.product)
      ? draft.product
      : (availableProducts[0]?.id ?? ''),
  };
  const update = (patch: Partial<LotFormT>) => setForm(prev => ({ ...prev, ...patch }));
  const createLot = useCreateShipperLot();
  const [palletsTouched, setPalletsTouched] = useState(false);
  const maxPallets = Math.max(
    ...catalog.containers.map(({ capacity_pallets }) => capacity_pallets),
    0
  );
  const palletLimit = maxPallets > 0 ? maxPallets : DEFAULT_MAX_PALLETS;
  const palletCount = Number(form.pallets);
  const palletError = palletErrorOf(form.pallets, palletLimit);
  const stepPallets = (delta: number) => {
    const current = Number.isSafeInteger(palletCount) ? palletCount : 0;
    update({ pallets: String(Math.min(Math.max(current + delta, 1), palletLimit)) });
    setPalletsTouched(true);
  };

  const requestJson =
    isComplete(form) && !palletError ? JSON.stringify(toRequest(catalog, form)) : '';
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
  const errorOf = (field: string) =>
    (field === 'pallets' && palletsTouched ? palletError : null) ??
    fieldErrors.find(error => error.field === field)?.message;
  const errorRef = (field: string) => !!errorOf(field) && errorIdOf(field);
  const otherErrors = fieldErrors
    .filter(
      ({ field }) =>
        ![
          'product',
          'pallets',
          'ready_date',
          'destination',
          'shipper',
          'packhouse_id',
          'sell_window',
        ].includes(field)
    )
    .map(({ message }) => message);

  const product = catalog.products.find(({ id: productId }) => productId === form.product);
  const destinations = destinationsOf(catalog);

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

  const expectedLoss = previewExpectedLossOf(previewData);

  const selectedPackhouse = places.find(place => place.packhouse_id === form.packhouse_id);
  const selectedPlace = useMemo(
    () => (selectedPackhouse ? { ...selectedPackhouse, id: selectedPackhouse.packhouse_id } : null),
    [selectedPackhouse]
  );
  const hasWarnings = (previewData?.hints.warnings.length ?? 0) > 0;

  return (
    <section id={id} className={cn('m2-card scroll-mt-24', className)} aria-label="새 출하 등록">
      <h2 className="m2-h2">새 출하 등록</h2>
      <div className="m2-sub mb-3">출하 정보</div>

      <form
        className="flex flex-col gap-3.5"
        onSubmit={event => {
          event.preventDefault();
          setPalletsTouched(true);
          if (createLot.isPending || !isComplete(form) || palletError) return;
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
        <div className="grid items-start gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="flex min-w-0 flex-col gap-3.5">
            <FormStep
              index={1}
              label="품목"
              error={errorOf('product')}
              errorId={errorIdOf('product')}
            >
              <Select
                value={form.product}
                onValueChange={value => update({ product: value })}
                disabled={!availableProducts.length}
              >
                <SelectTrigger
                  className="m2-inp h-[42px] w-full"
                  aria-label="품목"
                  {...describedBy(errorRef('product'))}
                >
                  <SelectValue
                    placeholder={productsQuery.isPending ? '품목 불러오는 중' : '품목을 선택하세요'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {so2Text(item.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productsQuery.isError && (
                <p role="alert" className="mt-1 text-[12px] text-m2-crit">
                  품목을 불러오지 못했습니다.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => productsQuery.refetch()}
                  >
                    다시 시도
                  </button>
                </p>
              )}
              <Link
                href={SHIPPER_PATHS.PRODUCTS}
                className="mt-1.5 inline-block text-[12px] text-m2-brand-ink underline underline-offset-2"
              >
                품목 추가·보관 조건 관리
              </Link>
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
              errorId={errorIdOf('pallets')}
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
                  disabled={!Number.isSafeInteger(palletCount) || palletCount <= 1}
                  onClick={() => stepPallets(-1)}
                >
                  −
                </button>
                <input
                  id={`${fieldId}-pallets`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.pallets}
                  aria-invalid={!!errorOf('pallets')}
                  {...describedBy(errorRef('pallets'))}
                  onChange={event => {
                    update({ pallets: event.target.value });
                    setPalletsTouched(false);
                  }}
                  onBlur={() => {
                    setPalletsTouched(true);
                    if (!palletError) update({ pallets: String(palletCount) });
                  }}
                  className="m2-num h-full min-w-0 flex-1 [appearance:textfield] border-0 bg-transparent text-center text-[15px] font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="한 파렛트 늘리기"
                  className="h-full w-11 flex-none border-0 bg-transparent text-[18px] text-m2-ink-2 disabled:opacity-40"
                  disabled={palletCount >= palletLimit}
                  onClick={() => stepPallets(1)}
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
              errorId={errorIdOf('destination')}
            >
              <Select
                value={form.destination}
                onValueChange={destination => update({ destination })}
              >
                <SelectTrigger
                  id={`${fieldId}-destination`}
                  className="m2-inp w-full"
                  aria-invalid={!!errorOf('destination')}
                  {...describedBy(errorRef('destination'))}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map(port => (
                    <SelectItem key={port.id} value={port.id}>
                      {port.unlocode ? `${port.name} (${port.unlocode})` : port.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormStep>

            <FormStep
              index={4}
              label="출하 가능일"
              htmlFor={`${fieldId}-ready`}
              error={errorOf('ready_date')}
              errorId={errorIdOf('ready_date')}
            >
              <DatePicker
                id={`${fieldId}-ready`}
                className="m2-inp m2-num w-full"
                value={form.ready_date}
                aria-invalid={!!errorOf('ready_date')}
                {...describedBy(errorRef('ready_date'), hasWarnings && warningsId)}
                onValueChange={ready_date => update({ ready_date })}
              />
            </FormStep>

            <FormStep
              index={5}
              label="출하 장소"
              htmlFor={`${fieldId}-packhouse`}
              error={errorOf('packhouse_id') ?? errorOf('shipper')}
              errorId={errorIdOf('packhouse_id')}
            >
              <Select
                value={form.packhouse_id}
                onValueChange={packhouse_id => update({ packhouse_id })}
                disabled={profileQuery.isPending || places.length === 0}
              >
                <SelectTrigger
                  id={`${fieldId}-packhouse`}
                  className="m2-inp w-full"
                  aria-invalid={!!errorOf('packhouse_id') || !!errorOf('shipper')}
                  {...describedBy(
                    (!!errorOf('packhouse_id') || !!errorOf('shipper')) && errorIdOf('packhouse_id')
                  )}
                >
                  <SelectValue
                    placeholder={
                      profileQuery.isPending ? '출하 장소 불러오는 중' : '등록된 출하 장소 없음'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {places.map(place => (
                    <SelectItem key={place.packhouse_id} value={place.packhouse_id}>
                      {[place.name, place.region].filter(Boolean).join(' · ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profileQuery.isError && (
                <p role="alert" className="mt-1 text-xs text-m2-crit">
                  출하 장소를 불러오지 못했습니다.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => profileQuery.refetch()}
                  >
                    다시 시도
                  </button>
                </p>
              )}
            </FormStep>
          </div>
          <ShipperPickupMap place={selectedPlace} />
        </div>

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
            <p id={errorIdOf('sell_window')} className="mt-1 text-[12px] text-m2-crit">
              {errorOf('sell_window')}
            </p>
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
                  ? `조건상 검토 가능 · ${fmtDay(previewData.hints.air.arrival_date)} 도착 예상`
                  : '현재 조건상 어려움'}
              </b>
            </div>
          )}
          {expectedLoss && (
            <div>
              <span>예상 손실률 ({expectedLoss.mode === 'air' ? '항공' : '해상'})</span>
              <b className={cn(isChecking && 'text-m2-muted')}>
                {lossRateText(expectedLoss)} · {lossBasisText(expectedLoss)}
              </b>
            </div>
          )}
        </div>

        {previewData?.hints.air.feasible && (
          <p className="m2-sub -mt-1 text-xs">실제 항공편 좌석과 예약은 포워더에게 별도로 확인하세요.</p>
        )}

        <div
          id={warningsId}
          role="status"
          className={hasWarnings ? 'm2-note m2-note-warn mt-0' : 'sr-only'}
        >
          {hasWarnings && (
            <>
              <TriangleAlertIcon size={14} aria-hidden />
              <div>{plainWords(previewData?.hints.warnings.join(' · ') ?? '')}</div>
            </>
          )}
        </div>
        {otherErrors.length > 0 && (
          <p role="alert" className="text-[12px] text-m2-crit">
            {otherErrors.join(' · ')}
          </p>
        )}

        <button
          type="submit"
          className="m2-btn m2-btn-pri m2-btn-lg w-full"
          disabled={!isComplete(form) || !!palletError}
          aria-disabled={createLot.isPending}
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
