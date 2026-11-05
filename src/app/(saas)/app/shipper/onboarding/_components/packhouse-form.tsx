'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useId, useRef, useState } from 'react';

import { useCreateShipperPackhouse } from '@/apis/saas/shipper-profile';
import { toFieldErrors } from '@/app/(saas)/app/shipper/_components/query-state';
import type { CoordinateT } from '@/app/(saas)/app/shipper/onboarding/_components/packhouse-map';
import type { PackhouseT, ShipperProductOptionT } from '@/types/saas-shipper';

const PackhouseMap = dynamic(
  () => import('@/app/(saas)/app/shipper/onboarding/_components/packhouse-map'),
  {
    ssr: false,
    loading: () => (
      <div className="m2-sub grid h-[320px] place-items-center rounded-[12px] bg-[rgba(15,27,51,.04)] min-[1100px]:h-[520px]">
        지도를 불러오는 중
      </div>
    ),
  }
);

const LAT_RANGE = [33, 39] as const;
const LON_RANGE = [124, 132] as const;

type FieldT = 'name' | 'region' | 'lat' | 'lon' | 'product_ids';

const FIELD_ORDER: FieldT[] = ['name', 'region', 'lat', 'lon', 'product_ids'];

type FormT = {
  name: string;
  region: string;
  lat: string;
  lon: string;
  productIds: string[];
};

const EMPTY_FORM: FormT = { name: '', region: '', lat: '', lon: '', productIds: [] };

const toNumber = (value: string) => {
  if (value.trim() === '') return null;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const rangeError = (value: string, [min, max]: readonly [number, number], label: string) => {
  const parsed = toNumber(value);
  if (parsed === null) return `${label}를 넣거나 지도에서 위치를 고르세요.`;
  if (parsed < min || parsed > max) return `${label}는 ${min}~${max} 사이여야 합니다.`;

  return null;
};

const validate = (form: FormT): Partial<Record<FieldT, string>> => {
  const errors: Partial<Record<FieldT, string>> = {};
  if (!form.name.trim()) errors.name = '출하 장소 이름을 넣으세요.';
  if (!form.region.trim()) errors.region = '주소나 지역을 넣으세요.';
  const lat = rangeError(form.lat, LAT_RANGE, '위도');
  if (lat) errors.lat = lat;
  const lon = rangeError(form.lon, LON_RANGE, '경도');
  if (lon) errors.lon = lon;
  if (form.productIds.length === 0) errors.product_ids = '취급 품목을 하나 이상 고르세요.';

  return errors;
};

const coordinateOf = (form: FormT): CoordinateT | null => {
  const lat = toNumber(form.lat);
  const lon = toNumber(form.lon);
  if (lat === null || lon === null) return null;
  if (lat < LAT_RANGE[0] || lat > LAT_RANGE[1] || lon < LON_RANGE[0] || lon > LON_RANGE[1]) {
    return null;
  }

  return { lat, lon };
};

const describedBy = (...ids: (string | false | null)[]) => {
  const value = ids.filter((id): id is string => !!id).join(' ');

  return value ? { 'aria-describedby': value } : {};
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="text-[12px] text-m2-crit">
      {message}
    </p>
  );
}

function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="m2-sub mt-0 text-[12px]">
      {children}
    </p>
  );
}

type PackhouseFormPropsT = {
  productOptions: ShipperProductOptionT[];
  onCreated: (packhouse: PackhouseT) => void;
};

export function PackhouseForm({ productOptions, onCreated }: PackhouseFormPropsT) {
  const id = useId();
  const ids = {
    name: `${id}-name`,
    region: `${id}-region`,
    regionHint: `${id}-region-hint`,
    lat: `${id}-lat`,
    lon: `${id}-lon`,
    coordHint: `${id}-coord-hint`,
    products: `${id}-products`,
    error: (field: FieldT) => `${id}-${field}-error`,
  };
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormT>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const createPackhouse = useCreateShipperPackhouse();
  const update = (patch: Partial<FormT>) => setForm(prev => ({ ...prev, ...patch }));

  const clientErrors = submitted ? validate(form) : {};
  const serverErrors = Object.fromEntries(
    toFieldErrors(createPackhouse.error).map(({ field, message }) => [field, message])
  ) as Partial<Record<FieldT, string>>;
  const errorOf = (field: FieldT) => clientErrors[field] ?? serverErrors[field];
  const invalid = (field: FieldT) => !!errorOf(field);
  const errorId = (field: FieldT) => invalid(field) && ids.error(field);

  const toggleProduct = (productId: string, checked: boolean) =>
    update({
      productIds: checked
        ? [...new Set([...form.productIds, productId])]
        : form.productIds.filter(item => item !== productId),
    });

  return (
    <form
      ref={formRef}
      noValidate
      aria-label="출하 장소 등록"
      className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]"
      onSubmit={event => {
        event.preventDefault();
        if (createPackhouse.isPending) return;
        setSubmitted(true);
        const errors = validate(form);
        const first = FIELD_ORDER.find(field => errors[field]);
        if (first) {
          const target =
            first === 'product_ids'
              ? formRef.current?.querySelector<HTMLInputElement>(
                  `#${CSS.escape(ids.products)} input`
                )
              : formRef.current?.querySelector<HTMLInputElement>(`#${CSS.escape(ids[first])}`);
          target?.focus();

          return;
        }
        createPackhouse.mutate(
          {
            name: form.name.trim(),
            region: form.region.trim(),
            lat: Number(form.lat),
            lon: Number(form.lon),
            product_ids: form.productIds,
          },
          {
            onSuccess: packhouse => {
              setForm(EMPTY_FORM);
              setSubmitted(false);
              onCreated(packhouse);
            },
          }
        );
      }}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="m2-field mb-0">
          <label htmlFor={ids.name}>출하 장소 이름</label>
          <input
            id={ids.name}
            className="m2-inp w-full"
            autoComplete="organization"
            value={form.name}
            aria-invalid={invalid('name')}
            {...describedBy(errorId('name'))}
            onChange={event => update({ name: event.target.value })}
          />
          <FieldError id={ids.error('name')} message={errorOf('name')} />
        </div>

        <div className="m2-field mb-0">
          <label htmlFor={ids.region}>주소 · 지역</label>
          <input
            id={ids.region}
            className="m2-inp w-full"
            autoComplete="street-address"
            placeholder="예: 경남 진주시 문산읍"
            value={form.region}
            aria-invalid={invalid('region')}
            {...describedBy(ids.regionHint, errorId('region'))}
            onChange={event => update({ region: event.target.value })}
          />
          <FieldHint id={ids.regionHint}>
            집하 트럭이 들르는 곳의 주소나 시·군 이름을 적어요.
          </FieldHint>
          <FieldError id={ids.error('region')} message={errorOf('region')} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[12.5px] font-semibold">위치 (좌표)</legend>
          <FieldHint id={ids.coordHint}>
            지도에서 위치를 선택하거나 좌표를 입력하세요. 대한민국 범위(위도 {LAT_RANGE[0]}~
            {LAT_RANGE[1]}, 경도 {LON_RANGE[0]}~{LON_RANGE[1]})만 받습니다.
          </FieldHint>
          <div className="grid grid-cols-2 gap-3 max-[479.98px]:grid-cols-1">
            <div className="m2-field mb-0">
              <label htmlFor={ids.lat}>위도</label>
              <input
                id={ids.lat}
                type="number"
                inputMode="decimal"
                step="0.000001"
                min={LAT_RANGE[0]}
                max={LAT_RANGE[1]}
                className="m2-inp m2-num w-full"
                placeholder="35.180"
                value={form.lat}
                aria-invalid={invalid('lat')}
                {...describedBy(ids.coordHint, errorId('lat'))}
                onChange={event => {
                  update({ lat: event.target.value });
                }}
              />
              <FieldError id={ids.error('lat')} message={errorOf('lat')} />
            </div>
            <div className="m2-field mb-0">
              <label htmlFor={ids.lon}>경도</label>
              <input
                id={ids.lon}
                type="number"
                inputMode="decimal"
                step="0.000001"
                min={LON_RANGE[0]}
                max={LON_RANGE[1]}
                className="m2-inp m2-num w-full"
                placeholder="128.107"
                value={form.lon}
                aria-invalid={invalid('lon')}
                {...describedBy(ids.coordHint, errorId('lon'))}
                onChange={event => {
                  update({ lon: event.target.value });
                }}
              />
              <FieldError id={ids.error('lon')} message={errorOf('lon')} />
            </div>
          </div>
        </fieldset>

        <fieldset
          id={ids.products}
          {...describedBy(errorId('product_ids'))}
          className="flex flex-col gap-2"
        >
          <legend className="mb-1.5 text-[12.5px] font-semibold">취급 품목</legend>
          <div className="flex flex-wrap gap-2">
            {productOptions.map(option => {
              const inputId = `${id}-product-${option.product_id}`;

              return (
                <label
                  key={option.product_id}
                  htmlFor={inputId}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[12px] bg-white px-3 text-[13px] font-semibold shadow-[0_0_0_1px_var(--m2-line-2)]"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    className="m2-cb"
                    checked={form.productIds.includes(option.product_id)}
                    aria-invalid={invalid('product_ids')}
                    {...describedBy(errorId('product_ids'))}
                    onChange={event => toggleProduct(option.product_id, event.target.checked)}
                  />
                  {option.name.replace(/SO2/g, 'SO₂')}
                </label>
              );
            })}
          </div>
          <FieldError id={ids.error('product_ids')} message={errorOf('product_ids')} />
        </fieldset>

        <button
          type="submit"
          className="m2-btn m2-btn-pri m2-btn-lg w-full"
          aria-disabled={createPackhouse.isPending}
        >
          {createPackhouse.isPending ? '등록 중' : '출하 장소 등록'}
        </button>
      </div>
      <section
        className="min-w-0 min-[1100px]:sticky min-[1100px]:top-0"
        aria-label="출하 장소 위치 지도"
      >
        <h3 className="m2-h3 mb-2">출하 장소 위치</h3>
        <p className="m2-sub mb-3">집하 트럭이 도착할 위치를 지도에서 선택하세요.</p>
        <div role="group" aria-label="지도에서 위치 고르기 (키보드는 위도·경도 입력칸 사용)">
          <PackhouseMap
            value={coordinateOf(form)}
            onPick={({ lat, lon }) => {
              update({ lat: String(lat), lon: String(lon) });
            }}
          />
        </div>
      </section>
    </form>
  );
}
