'use client';

import { type ReactNode, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useUpdateShipperLot } from '@/apis/saas/shipper';
import { toIntakeOptions } from '@/app/(saas)/app/shipper/_components/catalog';
import { SELL_WINDOW_LABEL, lotWarningsOf } from '@/app/(saas)/app/shipper/_components/labels';
import { lotLabel } from '@/app/(saas)/app/shipper/_components/lot-label';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import { errorDetail, toFieldErrors } from '@/app/(saas)/app/shipper/_components/query-state';
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
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ShipperCatalogT, ShipperLotPatchT, ShipperLotT } from '@/types/saas-shipper';

type LotEditDialogPropsT = {
  lot: ShipperLotT;
  catalog: ShipperCatalogT;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
};

const EDIT_FIELDS = ['product', 'destination', 'pallets', 'ready_date', 'sell_window'] as const;

type EditFieldT = (typeof EDIT_FIELDS)[number];

const isEditField = (field: string): field is EditFieldT =>
  (EDIT_FIELDS as readonly string[]).includes(field);

const otherFieldMessages = (error: unknown) =>
  toFieldErrors(error)
    .filter(({ field }) => !isEditField(field))
    .map(({ message }) => message);

type EditFormT = Omit<{ [K in EditFieldT]-?: NonNullable<ShipperLotPatchT[K]> }, 'pallets'> & {
  pallets: string;
};

const changedFields = (lot: ShipperLotT, form: EditFormT): ShipperLotPatchT => {
  const patch: ShipperLotPatchT = {};

  if (form.product !== lot.product_id) patch.product = form.product;
  if (form.destination !== lot.destination) patch.destination = form.destination;
  if (Number(form.pallets) !== lot.pallets) patch.pallets = Number(form.pallets);
  if (form.ready_date !== lot.ready_date) patch.ready_date = form.ready_date;
  if (form.sell_window !== lot.sell_window) patch.sell_window = form.sell_window;

  return patch;
};

export function LotEditDialog({ lot, catalog, onClose, onCloseAutoFocus }: LotEditDialogPropsT) {
  const options = toIntakeOptions(catalog);
  const updateLot = useUpdateShipperLot();
  const [form, setForm] = useState<EditFormT>({
    product: lot.product_id,
    destination: lot.destination,
    pallets: String(lot.pallets),
    ready_date: lot.ready_date,
    sell_window: lot.sell_window,
  });
  const savingRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const palletLimit =
    Math.max(0, ...catalog.containers.map(container => container.capacity_pallets)) || 20;
  const count = Number(form.pallets);
  const palletError = (() => {
    if (!form.pallets.trim()) return '파렛트 수량을 입력하세요.';
    if (!/^\d+$/.test(form.pallets.trim()) || !Number.isSafeInteger(count) || count < 1) {
      return '파렛트 수량은 1 이상의 정수로 입력하세요.';
    }
    if (count > palletLimit) {
      return `컨테이너 1대 용량(${palletLimit}파렛트)을 넘습니다. 나눠서 등록하세요.`;
    }
  })();
  const dirty = Object.keys(changedFields(lot, form)).length > 0;
  const requestClose = () => {
    if (savingRef.current || updateLot.isPending || discardOpen) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  };
  const update = (patch: Partial<EditFormT>) => {
    if (savingRef.current || updateLot.isPending) return;
    setForm(prev => ({ ...prev, ...patch }));
  };
  const fieldErrors = toFieldErrors(updateLot.error);
  const errorOf = (field: EditFieldT) =>
    (field === 'pallets' && submitted && palletError) ||
    fieldErrors.find(error => error.field === field)?.message;
  const otherErrors = otherFieldMessages(updateLot.error);
  const label = lotLabel(lot, catalog);

  return (
    <Dialog open onOpenChange={open => !open && requestClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto pt-6"
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={event => {
          if (discardOpen) {
            event.preventDefault();
            setDiscardOpen(false);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>출하 수정</DialogTitle>
          <DialogDescription>
            <span title={lot.id}>{label}</span> · 계획에 들어가기 전까지만 바꿀 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col gap-4"
          noValidate
          onSubmit={event => {
            event.preventDefault();
            if (savingRef.current || updateLot.isPending) return;
            setSubmitted(true);
            if (palletError) {
              event.currentTarget.querySelector<HTMLInputElement>('input[type="number"]')?.focus();
              return;
            }
            const patch = changedFields(lot, form);

            if (Object.keys(patch).length === 0) {
              onClose();

              return;
            }
            savingRef.current = true;
            updateLot.mutate(
              { lotId: lot.id, patch },
              {
                onSuccess: updated => {
                  const warnings = lotWarningsOf(updated);
                  const message = `${lotLabel(updated, catalog)} 출하를 수정했습니다.`;
                  if (warnings.length > 0) {
                    toast.warning(message, { description: plainWords(warnings.join(' · ')) });
                  } else {
                    toast.success(message);
                  }
                  onClose();
                },
                onError: error => {
                  savingRef.current = false;
                  const others = otherFieldMessages(error);

                  if (toFieldErrors(error).length === 0) {
                    toast.error(errorDetail(error, '출하를 수정하지 못했습니다.'));
                  } else if (others.length > 0) {
                    toast.error('출하를 수정하지 못했습니다.', { description: others.join(' · ') });
                  }
                },
              }
            );
          }}
        >
          <fieldset disabled={updateLot.isPending} className="flex min-w-0 flex-col gap-4">
            <EditField label="품목" error={errorOf('product')}>
              {field => (
                <Select
                  disabled={updateLot.isPending}
                  value={form.product}
                  onValueChange={product => update({ product })}
                >
                  <SelectTrigger className="w-full" {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.products.map(({ id, label: optionLabel }) => (
                      <SelectItem key={id} value={id}>
                        {optionLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </EditField>
            <EditField label="수량 (파렛트)" error={errorOf('pallets')}>
              {field => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  max={palletLimit}
                  step={1}
                  className="num"
                  value={form.pallets}
                  onChange={event => update({ pallets: event.target.value })}
                />
              )}
            </EditField>
            <EditField label="목적지" error={errorOf('destination')}>
              {field => (
                <Select
                  disabled={updateLot.isPending}
                  value={form.destination}
                  onValueChange={destination => update({ destination })}
                >
                  <SelectTrigger className="w-full" {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.destinations.map(({ id, label: optionLabel }) => (
                      <SelectItem key={id} value={id}>
                        {optionLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </EditField>
            <EditField label="출하 가능일" error={errorOf('ready_date')}>
              {field => (
                <DatePicker
                  {...field}
                  disabled={updateLot.isPending}
                  className="num"
                  value={form.ready_date}
                  onValueChange={ready_date => update({ ready_date })}
                />
              )}
            </EditField>
            <EditField label="판매 기간" error={errorOf('sell_window')}>
              {field => (
                <Select
                  disabled={updateLot.isPending}
                  value={form.sell_window}
                  onValueChange={sellWindow =>
                    update({ sell_window: sellWindow as EditFormT['sell_window'] })
                  }
                >
                  <SelectTrigger className="w-full" {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SELL_WINDOW_LABEL) as EditFormT['sell_window'][]).map(value => (
                      <SelectItem key={value} value={value}>
                        {SELL_WINDOW_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </EditField>
          </fieldset>
          {otherErrors.length > 0 && (
            <p role="alert" className="text-sm text-berry">
              {otherErrors.join(' · ')}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={updateLot.isPending}
            >
              닫기
            </Button>
            <Button type="submit" disabled={updateLot.isPending}>
              {updateLot.isPending ? '저장 중' : '저장'}
            </Button>
          </DialogFooter>
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
            <AlertDialogAction onClick={onClose}>변경 내용 버리기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

type EditFieldPropsT = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
};

function EditField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (field: EditFieldPropsT) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const field: EditFieldPropsT = {
    id,
    'aria-invalid': !!error,
    ...(error ? { 'aria-describedby': errorId } : {}),
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(field)}
      {error && (
        <p id={errorId} className="text-sm text-berry">
          {error}
        </p>
      )}
    </div>
  );
}
