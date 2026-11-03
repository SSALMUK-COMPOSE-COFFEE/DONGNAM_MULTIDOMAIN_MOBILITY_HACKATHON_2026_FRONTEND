'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { useUpdateShipperLot } from '@/apis/saas/shipper';
import { toIntakeOptions } from '@/app/(saas)/app/shipper/_components/catalog';
import { SELL_WINDOW_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import { errorDetail, toFieldErrors } from '@/app/(saas)/app/shipper/_components/query-state';
import { Button } from '@/components/ui/button';
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
};

type EditFormT = Required<
  Pick<ShipperLotPatchT, 'product' | 'destination' | 'pallets' | 'ready_date' | 'sell_window'>
>;

const changedFields = (lot: ShipperLotT, form: EditFormT): ShipperLotPatchT => {
  const patch: ShipperLotPatchT = {};

  if (form.product !== lot.product_id) patch.product = form.product;
  if (form.destination !== lot.destination) patch.destination = form.destination;
  if (form.pallets !== lot.pallets) patch.pallets = form.pallets;
  if (form.ready_date !== lot.ready_date) patch.ready_date = form.ready_date;
  if (form.sell_window !== lot.sell_window) patch.sell_window = form.sell_window;

  return patch;
};

export function LotEditDialog({ lot, catalog, onClose }: LotEditDialogPropsT) {
  const options = toIntakeOptions(catalog);
  const updateLot = useUpdateShipperLot();
  const [form, setForm] = useState<EditFormT>({
    product: lot.product_id,
    destination: lot.destination,
    pallets: lot.pallets,
    ready_date: lot.ready_date,
    sell_window: lot.sell_window,
  });
  const update = (patch: Partial<EditFormT>) => setForm(prev => ({ ...prev, ...patch }));
  const fieldErrors = toFieldErrors(updateLot.error);
  const errorOf = (field: string) => fieldErrors.find(error => error.field === field)?.message;

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>출하 수정</DialogTitle>
          <DialogDescription>
            <span className="num">{lot.id}</span> · 계획에 들어가기 전까지만 바꿀 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={event => {
            event.preventDefault();
            const patch = changedFields(lot, form);

            if (Object.keys(patch).length === 0) {
              onClose();

              return;
            }
            updateLot.mutate(
              { lotId: lot.id, patch },
              {
                onSuccess: () => {
                  toast.success('출하를 수정했습니다.');
                  onClose();
                },
                onError: error => {
                  if (toFieldErrors(error).length === 0) {
                    toast.error(errorDetail(error, '출하를 수정하지 못했습니다.'));
                  }
                },
              }
            );
          }}
        >
          <EditField label="품목" error={errorOf('product')}>
            <Select value={form.product} onValueChange={product => update({ product })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.products.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="수량 (파렛트)" error={errorOf('pallets')}>
            <Input
              type="number"
              min={1}
              className="num"
              value={form.pallets}
              onChange={event => update({ pallets: Number(event.target.value) })}
            />
          </EditField>
          <EditField label="목적지" error={errorOf('destination')}>
            <Select value={form.destination} onValueChange={destination => update({ destination })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.destinations.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="출하 가능일" error={errorOf('ready_date')}>
            <Input
              type="date"
              className="num"
              value={form.ready_date}
              onChange={event => update({ ready_date: event.target.value })}
            />
          </EditField>
          <EditField label="판매 기간" error={errorOf('sell_window')}>
            <Select
              value={form.sell_window}
              onValueChange={sellWindow =>
                update({ sell_window: sellWindow as EditFormT['sell_window'] })
              }
            >
              <SelectTrigger className="w-full">
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
          </EditField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              닫기
            </Button>
            <Button type="submit" disabled={updateLot.isPending}>
              {updateLot.isPending ? '저장 중' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-berry">{error}</p>}
    </div>
  );
}
