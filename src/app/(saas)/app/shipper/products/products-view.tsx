'use client';

import { isAxiosError } from 'axios';
import { LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import { type FormEvent, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useMe } from '@/apis/saas/auth';
import { saasErrorReason } from '@/apis/saas/errors';
import {
  type ShipperProductInputT,
  type ShipperProductT,
  useArchiveShipperProduct,
  useRestoreShipperProduct,
  useSaveShipperProduct,
  useShipperProducts,
} from '@/apis/saas/shipper-products';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { ProductCards, ProductList } from '@/app/(saas)/app/shipper/products/product-list';
import { useProductViewPreference } from '@/app/(saas)/app/shipper/products/product-view-preference';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULTS: ShipperProductInputT = {
  name: '',
  temp_min_c: 0,
  temp_max_c: 5,
  shelf_life_days: 30,
  pallet_kg: 415,
  so2_treated: false,
  o2_pct: null,
  co2_pct: null,
};

type ProductErrorsT = Partial<Record<keyof ShipperProductInputT, string>>;

const validateProduct = (form: Record<string, string>): ProductErrorsT => {
  const errors: ProductErrorsT = {};
  if (!form.name.trim()) errors.name = '필수 입력 항목입니다.';
  else if (form.name.trim().length > 200) errors.name = '200자 이하로 입력하세요.';
  const numberOf = (
    key: keyof ShipperProductInputT,
    min: number,
    max: number,
    message: string,
    options: { optional?: boolean; integer?: boolean; positive?: boolean } = {}
  ) => {
    const raw = form[key]?.trim() ?? '';
    if (!raw) {
      if (!options.optional) errors[key] = '필수 입력 항목입니다.';
      return null;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) errors[key] = '올바른 숫자를 입력하세요.';
    else if (
      value < min ||
      value > max ||
      (options.positive && value <= 0) ||
      (options.integer && !Number.isInteger(value))
    )
      errors[key] = message;
    return value;
  };
  const minimum = numberOf('temp_min_c', -100, 100, '-100~100 사이로 입력하세요.');
  const maximum = numberOf('temp_max_c', -100, 100, '-100~100 사이로 입력하세요.');
  numberOf('shelf_life_days', 1, 3650, '1~3650 사이의 정수로 입력하세요.', { integer: true });
  numberOf('pallet_kg', 0, 10000, '0보다 크고 10,000 이하로 입력하세요.', { positive: true });
  const oxygen = numberOf('o2_pct', 0, 100, '0~100 사이로 입력하세요.', { optional: true });
  const carbon = numberOf('co2_pct', 0, 100, '0~100 사이로 입력하세요.', { optional: true });
  if (
    !errors.temp_min_c &&
    !errors.temp_max_c &&
    minimum !== null &&
    maximum !== null &&
    minimum > maximum
  ) {
    errors.temp_max_c = '최고 온도는 최저 온도 이상이어야 합니다.';
  }
  if (!errors.o2_pct && !errors.co2_pct && (oxygen ?? 0) + (carbon ?? 0) > 100) {
    errors.co2_pct = '산소와 이산화탄소의 합은 100% 이하여야 합니다.';
  }
  return errors;
};

export function ProductsView() {
  const products = useShipperProducts(true);
  const [view, setView] = useProductViewPreference();
  const ProductCollection = view === 'cards' ? ProductCards : ProductList;
  const archive = useArchiveShipperProduct();
  const restore = useRestoreShipperProduct();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [showArchived, setShowArchived] = useState(false);
  const [removing, setRemoving] = useState<{ product: ShipperProductT; orgId: string } | null>(
    null
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = () =>
    requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
      else searchRef.current?.focus();
    });
  const { data: me } = useMe();
  const [editor, setEditor] = useState<ShipperProductT | 'new' | null>(null);
  const orgId = me?.active_org.org_id ?? '';
  const [editorOrgId, setEditorOrgId] = useState(orgId);
  const openEditor = (product: ShipperProductT | 'new', trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setEditorOrgId(orgId);
    setEditor(product);
  };
  const open = editor !== null && editorOrgId === orgId;
  const removeOpen = removing !== null && removing.orgId === orgId;
  const active = products.data?.filter(product => !product.archived) ?? [];
  const archived = products.data?.filter(product => product.archived) ?? [];
  const items = showArchived ? archived : active;
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  const visible = items
    .filter(product => product.name.toLocaleLowerCase('ko-KR').includes(normalized))
    .sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name, 'ko', { numeric: true });
      if (sort === 'temperature') return a.temp_min_c - b.temp_min_c || nameOrder;
      if (sort === 'shelf') return a.shelf_life_days - b.shelf_life_days || nameOrder;
      return nameOrder;
    });
  let emptyTitle = '사용 중인 품목이 없습니다';
  let emptyDescription = '새 품목을 추가하거나 삭제된 품목을 복원하세요.';
  if (showArchived) {
    emptyTitle = '삭제된 품목이 없습니다';
    emptyDescription = '삭제한 품목은 여기에서 다시 복원할 수 있습니다.';
  }
  if (normalized) {
    emptyTitle = '검색 결과가 없습니다';
    emptyDescription = '다른 이름으로 검색하거나 검색어를 지워 보세요.';
  }
  const beginRemove = (product: ShipperProductT, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    archive.reset();
    setRemoving({ product, orgId });
  };
  const restoreProduct = (product: ShipperProductT, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    restore.mutate(product.id, {
      onSuccess: () => {
        toast.success(`${product.name} 품목을 복원했습니다.`);
        restoreFocus();
      },
      onError: failure =>
        toast.error(saasErrorReason(failure) ?? '복원하지 못했습니다. 다시 시도하세요.'),
    });
  };
  return (
    <>
      <ShipperPageHeader
        eyebrow="품목 관리"
        title="품목"
        sub="품목을 추가하고 출하에 사용할 온도와 보관 조건을 관리하세요."
      >
        <button
          type="button"
          className="m2-btn m2-btn-pri"
          onClick={event => openEditor('new', event.currentTarget)}
        >
          <Plus size={16} aria-hidden />새 품목 추가
        </button>
      </ShipperPageHeader>
      <p className="text-m2-ink-3 mb-5 text-[13px]">
        수정한 조건은 앞으로 등록하는 출하에 적용됩니다. 이미 등록한 출하의 조건은 유지됩니다.
        비용·손실률은 기본 가정값을 사용합니다.
      </p>
      {products.isPending && <CardSkeleton height={240} />}
      {products.isError && (
        <QueryError
          message="품목을 불러오지 못했습니다."
          onRetry={() => products.refetch()}
          isRetrying={products.isFetching}
        />
      )}
      {products.isSuccess && (
        <section aria-label="품목 목록" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="품목 상태"
              className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1"
            >
              {[
                { value: false, label: '사용 중', count: active.length },
                { value: true, label: '삭제됨', count: archived.length },
              ].map(tab => (
                <button
                  key={tab.label}
                  type="button"
                  aria-pressed={showArchived === tab.value}
                  onClick={() => setShowArchived(tab.value)}
                  className={
                    showArchived === tab.value
                      ? 'rounded-md bg-white px-3 py-1.5 text-[14px] font-semibold text-m2-navy shadow-sm'
                      : 'rounded-md px-3 py-1.5 text-[14px] text-m2-muted'
                  }
                >
                  {tab.label} <span className="ml-1 tabular-nums">{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 min-[1000px]:basis-auto">
              <div className="relative min-w-0 flex-1 basis-full min-[600px]:basis-[180px]">
                <Search
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-m2-muted"
                />
                <input
                  ref={searchRef}
                  type="search"
                  aria-label="품목 검색"
                  placeholder="품목 이름 검색"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  className="m2-inp w-full pr-9 pl-9 text-[14px] [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-m2-muted"
                  >
                    <X size={15} aria-hidden />
                  </button>
                )}
              </div>
              <div
                role="group"
                aria-label="품목 보기"
                className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1"
              >
                {[
                  { value: 'cards' as const, label: '카드', Icon: LayoutGrid },
                  { value: 'list' as const, label: '리스트', Icon: List },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                    className={
                      view === value
                        ? 'flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[14px] font-semibold text-m2-navy shadow-sm'
                        : 'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14px] text-m2-muted'
                    }
                  >
                    <Icon size={15} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger
                  aria-label="품목 정렬"
                  className="w-[160px] shrink-0 bg-white"
                  style={{ fontSize: 14 }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="temperature">온도 낮은순</SelectItem>
                  <SelectItem value="shelf">보관 기간 짧은순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mb-3">
            <p className="text-[14px] text-m2-muted" role="status">
              {visible.length} / {items.length}개{normalized ? ' · 검색 결과' : ''}
            </p>
          </div>
          {visible.length ? (
            <ProductCollection
              products={visible}
              archived={showArchived}
              busy={archive.isPending || restore.isPending}
              onEdit={openEditor}
              onRemove={beginRemove}
              onRestore={restoreProduct}
            />
          ) : (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )}
        </section>
      )}
      {open && (
        <ProductEditor
          key={`${orgId}-${editor === 'new' ? 'new' : editor?.id}`}
          product={editor === 'new' ? null : editor}
          onDone={() => setEditor(null)}
          onCloseAutoFocus={event => {
            event.preventDefault();
            restoreFocus();
          }}
        />
      )}
      <Dialog
        open={removeOpen}
        onOpenChange={value => {
          if (!value && !archive.isPending) setRemoving(null);
        }}
      >
        <DialogContent
          data-ui="m2"
          className="px-6 pt-6"
          onCloseAutoFocus={event => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="wrap-anywhere">{removing?.product.name} 품목 삭제</DialogTitle>
            <DialogDescription>
              새 출하를 등록할 때 목록에 표시되지 않습니다. 이미 등록한 출하와 운송계획은 유지되며,
              삭제됨 목록에서 복원할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {archive.isError && (
            <p role="alert" className="text-sm text-m2-crit">
              {saasErrorReason(archive.error) ?? '삭제하지 못했습니다. 다시 시도하세요.'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec"
              disabled={archive.isPending}
              onClick={() => setRemoving(null)}
            >
              취소
            </button>
            <button
              type="button"
              className="m2-btn bg-m2-berry text-white hover:bg-m2-berry-ink"
              disabled={archive.isPending}
              onClick={() => {
                if (!removing || removing.orgId !== orgId) return;
                archive.mutate(removing.product.id, {
                  onSuccess: () => {
                    toast.success(`${removing.product.name} 품목을 삭제했습니다.`);
                    setRemoving(null);
                  },
                });
              }}
            >
              {archive.isPending ? '삭제 중' : '삭제'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductEditor({
  product,
  onDone,
  onCloseAutoFocus,
}: {
  product: ShipperProductT | null;
  onDone: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const id = useId();
  const save = useSaveShipperProduct();
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      Object.entries(product ?? DEFAULTS).map(([key, value]) => [
        key,
        value == null ? '' : String(value),
      ])
    )
  );
  const [initialForm] = useState(form);
  const [discardOpen, setDiscardOpen] = useState(false);
  const savingRef = useRef(false);
  const dirty = Object.keys(DEFAULTS).some(key => {
    if (key === 'name') return form[key].trim() !== initialForm[key].trim();
    if (key === 'so2_treated') return form[key] !== initialForm[key];
    const value = form[key].trim();
    const initial = initialForm[key].trim();
    return value === '' || initial === '' ? value !== initial : Number(value) !== Number(initial);
  });
  const requestClose = () => {
    if (savingRef.current || save.isPending || discardOpen) return;
    if (dirty) setDiscardOpen(true);
    else onDone();
  };
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProductErrorsT>({});
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = (errors: ProductErrorsT) => {
    const first = Object.keys(errors)[0];
    if (first)
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
      );
  };
  const updateField = (key: string, value: string) => {
    if (savingRef.current || save.isPending) return;
    setForm(current => ({ ...current, [key]: value }));
    setFieldErrors(current => {
      const next = { ...current };
      delete next[key as keyof ShipperProductInputT];
      return next;
    });
    setError('');
  };
  const fieldError = (key: keyof ShipperProductInputT) =>
    fieldErrors[key] ? (
      <p id={`${id}-${key}-error`} className="mt-1 text-xs text-m2-crit" role="alert">
        {fieldErrors[key]}
      </p>
    ) : null;
  const field = (
    key: keyof ShipperProductInputT,
    label: string,
    options: { min?: number; max?: number; optional?: boolean; step?: string } = {}
  ) => (
    <div className="m2-field mb-0">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input
        id={`${id}-${key}`}
        name={key}
        aria-invalid={!!fieldErrors[key]}
        {...(fieldErrors[key] ? { 'aria-describedby': `${id}-${key}-error` } : {})}
        className="m2-inp w-full"
        type="number"
        step={options.step ?? 'any'}
        min={options.min}
        max={options.max}
        required={!options.optional}
        value={form[key]}
        onChange={event => updateField(key, event.target.value)}
      />
      {fieldError(key)}
    </div>
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current || save.isPending) return;
    setError('');
    const errors = validateProduct(form);
    formRef.current?.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach(input => {
      if (input.validity.badInput) {
        errors[input.name as keyof ShipperProductInputT] = '올바른 숫자를 입력하세요.';
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusError(errors);
      return;
    }
    const input: ShipperProductInputT = {
      name: form.name.trim(),
      temp_min_c: Number(form.temp_min_c),
      temp_max_c: Number(form.temp_max_c),
      shelf_life_days: Number(form.shelf_life_days),
      pallet_kg: Number(form.pallet_kg),
      o2_pct: form.o2_pct === '' ? null : Number(form.o2_pct),
      co2_pct: form.co2_pct === '' ? null : Number(form.co2_pct),
      so2_treated: form.so2_treated === 'true',
    };
    savingRef.current = true;
    save.mutate(
      { id: product?.id, input },
      {
        onSuccess: saved => {
          toast.success(`${saved.name} 품목을 저장했습니다.`);
          onDone();
        },
        onError: failure => {
          savingRef.current = false;
          const errors: ProductErrorsT = {};
          if (isAxiosError(failure)) {
            const detail: unknown = failure.response?.data?.detail;
            if (failure.response?.status === 409) errors.name = '같은 이름의 품목이 이미 있습니다.';
            if (Array.isArray(detail)) {
              detail.forEach(item => {
                const key = Array.isArray(item?.loc) ? item.loc.at(-1) : item?.field;
                if (typeof key === 'string' && key in DEFAULTS) {
                  errors[key as keyof ShipperProductInputT] =
                    typeof item?.msg === 'string' && /[가-힣]/.test(item.msg)
                      ? item.msg.replace(/^Value error, /, '')
                      : '입력한 값을 확인하세요.';
                }
              });
            }
          }
          setFieldErrors(errors);
          if (Object.keys(errors).length) focusError(errors);
          else setError(saasErrorReason(failure) ?? '품목을 저장하지 못했습니다. 다시 시도하세요.');
        },
      }
    );
  };
  return (
    <Dialog open onOpenChange={value => !value && requestClose()}>
      <DialogContent
        data-ui="m2"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto px-6 pt-6 sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={event => {
          if (discardOpen) {
            event.preventDefault();
            setDiscardOpen(false);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{product ? '품목 수정' : '품목 추가'}</DialogTitle>
          <DialogDescription>
            우리 회사 출하에 사용할 품목 이름과 보관 조건을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <fieldset disabled={save.isPending} className="flex min-w-0 flex-col gap-4">
            <div className="m2-field mb-0">
              <label htmlFor={`${id}-name`}>품목 이름</label>
              <input
                id={`${id}-name`}
                name="name"
                aria-invalid={!!fieldErrors.name}
                {...(fieldErrors.name ? { 'aria-describedby': `${id}-name-error` } : {})}
                className="m2-inp w-full"
                value={form.name}
                maxLength={200}
                required
                onChange={event => updateField('name', event.target.value)}
              />
              {fieldError('name')}
            </div>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-2 text-[13px] font-semibold">보관 온도</legend>
              {field('temp_min_c', '최저 온도 (°C)', { min: -100, max: 100 })}
              {field('temp_max_c', '최고 온도 (°C)', { min: -100, max: 100 })}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              {field('shelf_life_days', '보관 가능 기간 (일)', { min: 1, max: 3650, step: '1' })}
              {field('pallet_kg', '1파렛트 무게 (kg)', { min: 0, max: 10000 })}
            </div>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-2 text-[13px] font-semibold">가스 조건 (선택)</legend>
              {field('o2_pct', '산소 (%)', { min: 0, max: 100, optional: true })}
              {field('co2_pct', '이산화탄소 (%)', { min: 0, max: 100, optional: true })}
            </fieldset>
            <p className="text-m2-ink-3 -mt-2 text-[12px]">별도 가스 조건이 없으면 비워 두세요.</p>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.so2_treated === 'true'}
                onChange={event => updateField('so2_treated', String(event.target.checked))}
              />
              SO₂ 처리 품목
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="text-[13px] text-m2-crit">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec"
              onClick={requestClose}
              disabled={save.isPending}
            >
              취소
            </button>
            <button type="submit" className="m2-btn m2-btn-pri" disabled={save.isPending}>
              {save.isPending ? '저장 중' : '저장'}
            </button>
          </div>
        </form>
      </DialogContent>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>변경 내용을 버릴까요?</AlertDialogTitle>
            <AlertDialogDescription>저장하지 않은 변경 내용이 사라집니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 수정</AlertDialogCancel>
            <AlertDialogAction onClick={onDone}>변경 내용 버리기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
