'use client';

import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';

import type { ShipperProductT } from '@/apis/saas/shipper-products';

type ProductListPropsT = {
  products: ShipperProductT[];
  archived: boolean;
  busy: boolean;
  onEdit: (product: ShipperProductT, trigger: HTMLButtonElement) => void;
  onRemove: (product: ShipperProductT, trigger: HTMLButtonElement) => void;
  onRestore: (product: ShipperProductT, trigger: HTMLButtonElement) => void;
};

const gas = (value: number | null | undefined) => (value == null ? '미지정' : `${value}%`);

function ProductActions({
  product,
  archived,
  busy,
  onEdit,
  onRemove,
  onRestore,
}: Omit<ProductListPropsT, 'products'> & { product: ShipperProductT }) {
  const action =
    (callback: ProductListPropsT['onEdit']) => (event: MouseEvent<HTMLButtonElement>) =>
      callback(product, event.currentTarget);
  const buttonClass =
    'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-m2-muted transition-colors hover:bg-m2-brand-soft hover:text-m2-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m2-brand disabled:opacity-40';
  return (
    <div className="flex justify-end gap-0.5">
      {archived ? (
        <button
          type="button"
          className={buttonClass}
          aria-label={`${product.name} 복원`}
          disabled={busy}
          onClick={action(onRestore)}
        >
          <RotateCcw size={16} aria-hidden />
        </button>
      ) : (
        <>
          <button
            type="button"
            className={buttonClass}
            aria-label={`${product.name} 수정`}
            disabled={busy}
            onClick={action(onEdit)}
          >
            <Pencil size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-label={`${product.name} 삭제`}
            disabled={busy}
            onClick={action(onRemove)}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

function Conditions({ product }: { product: ShipperProductT }) {
  const hasGas = product.o2_pct != null || product.co2_pct != null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
      {product.so2_treated && (
        <span className="rounded bg-m2-grape-soft px-1.5 py-0.5 font-medium text-m2-grape-ink">
          SO₂
        </span>
      )}
      {hasGas && (
        <span className="text-m2-muted">
          O₂ {gas(product.o2_pct)} · CO₂ {gas(product.co2_pct)}
        </span>
      )}
      {!product.so2_treated && !hasGas && <span className="text-m2-muted">일반</span>}
    </div>
  );
}

export function ProductList(props: ProductListPropsT) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-m2-line bg-white min-[1000px]:block">
        <table
          className="w-full table-fixed border-collapse text-left text-[13px]"
          aria-label="품목 보관 조건"
        >
          <thead className="border-b border-m2-line bg-slate-50 text-[12px] text-m2-muted">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">
                품목
              </th>
              <th scope="col" className="w-[98px] px-3 py-2.5 text-right font-medium">
                온도
              </th>
              <th scope="col" className="w-[90px] px-3 py-2.5 text-right font-medium">
                보관 기간
              </th>
              <th scope="col" className="w-[100px] px-3 py-2.5 text-right font-medium">
                1파렛트
              </th>
              <th scope="col" className="w-[195px] px-3 py-2.5 font-medium">
                보관 조건
              </th>
              <th scope="col" className="w-[96px] px-3 py-2.5 text-right font-medium">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-m2-line">
            {props.products.map(product => (
              <tr key={product.id} className="transition-colors hover:bg-slate-50/80">
                <th scope="row" className="px-3 py-1.5 font-medium wrap-anywhere text-m2-ink">
                  <span className="line-clamp-2 wrap-anywhere" title={product.name}>
                    {product.name}
                  </span>
                </th>
                <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                  {product.temp_min_c}~{product.temp_max_c}°C
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{product.shelf_life_days}일</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                  {product.pallet_kg.toLocaleString('ko-KR')}kg
                </td>
                <td className="px-3 py-1.5">
                  <Conditions product={product} />
                </td>
                <td className="px-2 py-1.5">
                  <ProductActions {...props} product={product} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className="divide-y divide-m2-line overflow-hidden rounded-xl border border-m2-line bg-white min-[1000px]:hidden"
        aria-label="품목 보관 조건"
      >
        {props.products.map(product => (
          <li key={product.id} className="px-3 py-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <h2 className="line-clamp-2 min-w-0 text-[13.5px] font-semibold wrap-anywhere">
                {product.name}
              </h2>
              <ProductActions {...props} product={product} />
            </div>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-m2-muted tabular-nums">
              <span>
                {product.temp_min_c}~{product.temp_max_c}°C
              </span>
              <span>{product.shelf_life_days}일 보관</span>
              <span>{product.pallet_kg.toLocaleString('ko-KR')}kg/파렛트</span>
            </p>
            <details className="mt-1 text-[12px]">
              <summary className="w-fit cursor-pointer py-1 text-m2-muted">
                보관 조건{product.so2_treated ? ' · SO₂ 처리' : ''}
              </summary>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pb-1 text-m2-muted">
                <dt>산소 / 이산화탄소</dt>
                <dd>
                  {gas(product.o2_pct)} / {gas(product.co2_pct)}
                </dd>
                <dt>SO₂ 처리</dt>
                <dd>{product.so2_treated ? '처리함' : '처리 안 함'}</dd>
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ProductCards(props: ProductListPropsT) {
  return (
    <ul
      aria-label="품목 카드"
      className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1180px]:grid-cols-3 min-[1400px]:grid-cols-4"
    >
      {props.products.map(product => (
        <li
          key={product.id}
          className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-m2-line bg-white p-5"
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h2
              className="line-clamp-2 min-w-0 pt-1.5 text-[18px] font-semibold wrap-anywhere"
              title={product.name}
            >
              {product.name}
            </h2>
            <div className="shrink-0">
              <ProductActions {...props} product={product} />
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 text-left">
            <p className="text-lg leading-tight font-semibold tabular-nums">
              {product.temp_min_c}~{product.temp_max_c}°C
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-m2-muted tabular-nums">
              <span>보관 {product.shelf_life_days}일</span>
              <span>{product.pallet_kg.toLocaleString('ko-KR')}kg/파렛트</span>
            </p>
            <Conditions product={product} />
          </div>
        </li>
      ))}
    </ul>
  );
}
