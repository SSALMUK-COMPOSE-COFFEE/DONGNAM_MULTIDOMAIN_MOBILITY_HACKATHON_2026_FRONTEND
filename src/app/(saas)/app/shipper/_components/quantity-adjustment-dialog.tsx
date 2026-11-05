'use client';

import { ArrowRightIcon } from 'lucide-react';
import { type ReactNode, useId } from 'react';

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

import './quantity-adjustment.css';

type QuantityAdjustmentDialogPropsT = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentLabel: string;
  currentQuantity: number;
  quantity: string;
  onQuantityChange: (value: string) => void;
  fieldError?: string | null;
  requestError?: string | null;
  quoteContent: ReactNode;
  quoteLoading: boolean;
  submitting: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  onCloseAutoFocus?: (event: Event) => void;
};

export function QuantityAdjustmentDialog({
  open,
  onOpenChange,
  shipmentLabel,
  currentQuantity,
  quantity,
  onQuantityChange,
  fieldError,
  requestError,
  quoteContent,
  quoteLoading,
  submitting,
  canConfirm,
  onConfirm,
  onCloseAutoFocus,
}: QuantityAdjustmentDialogPropsT) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  return (
    <Dialog open={open} onOpenChange={next => !submitting && onOpenChange(next)}>
      <DialogContent
        data-ui="m2"
        className="quantity-adjust-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>출하 수량 변경</DialogTitle>
          <DialogDescription>{shipmentLabel}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <div className="quantity-adjust-entry">
              <div className="quantity-adjust-current">
                <span>현재 수량</span>
                <strong>
                  {currentQuantity}
                  <small>파렛트</small>
                </strong>
              </div>
              <ArrowRightIcon aria-hidden className="quantity-adjust-arrow" />
              <div className="quantity-adjust-next">
                <Label htmlFor={fieldId}>변경 후 수량 (파렛트)</Label>
                <Input
                  id={fieldId}
                  inputMode="numeric"
                  value={quantity}
                  onChange={event => onQuantityChange(event.target.value)}
                  disabled={submitting}
                  aria-invalid={!!fieldError}
                  {...(fieldError ? { 'aria-describedby': errorId } : {})}
                />
              </div>
            </div>
            <div className="quantity-adjust-entry-bottom">
              {fieldError ? (
                <p id={errorId} role="alert" className="text-m2-crit">
                  {fieldError}
                </p>
              ) : (
                <span>예상 부담금을 확인한 뒤 변경을 요청하세요.</span>
              )}
              <button type="button" disabled={submitting} onClick={() => onQuantityChange('0')}>
                전량 취소
              </button>
            </div>
          </div>
          <div aria-live="polite" aria-busy={quoteLoading}>
            {quoteLoading ? (
              <p className="text-sm text-muted-foreground">변경 조건을 확인하고 있습니다.</p>
            ) : (
              quoteContent
            )}
          </div>
          <p className="quantity-adjust-note">
            출항 후 부담액을 산정하며, 다시 채워진 만큼 정산에서 차감합니다.
          </p>
          {requestError && (
            <p role="alert" className="text-sm text-m2-crit">
              {requestError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || quoteLoading || submitting}
            onClick={onConfirm}
          >
            {submitting ? '요청 중' : '변경 요청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
