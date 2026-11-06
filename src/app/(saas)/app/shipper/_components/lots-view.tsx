'use client';

import { ArrowRightIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { useShipperCatalog, useShipperOrgId } from '@/apis/saas/shipper';
import { useShipperProfile } from '@/apis/saas/shipper-profile';
import { IntakeResultCard } from '@/app/(saas)/app/shipper/_components/intake-result-card';
import { seasonWarningsOf } from '@/app/(saas)/app/shipper/_components/labels';
import { LotTable } from '@/app/(saas)/app/shipper/_components/lot-table';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperLotForm } from '@/app/(saas)/app/shipper/_components/shipper-lot-form';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ShipperLotPreviewT } from '@/types/saas-shipper';

const RAW_LOT_DEFAULT = /\blot_id\b/;
const NO_PRODUCTS: string[] = [];

const shipperFacing = (preview: ShipperLotPreviewT): ShipperLotPreviewT => ({
  ...preview,
  defaults_applied: preview.defaults_applied
    .filter(item => !RAW_LOT_DEFAULT.test(item))
    .map(item => item.replace(/\bsell_by_date\b/g, '판매기한')),
});

function SeasonNotice({ preview }: { preview: ShipperLotPreviewT | null }) {
  const warnings = preview ? seasonWarningsOf(preview) : [];

  return (
    <div role="status" className={warnings.length > 0 ? 'm2-note m2-note-warn mt-0' : 'sr-only'}>
      {warnings.length > 0 && (
        <>
          <TriangleAlertIcon size={14} aria-hidden />
          <div>
            <b className="block">수출 시기 밖 출하</b>
            {plainWords(warnings.join(' · '))}
          </div>
        </>
      )}
    </div>
  );
}

export function LotsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get('new') === '1';
  const orgId = useShipperOrgId();
  const catalog = useShipperCatalog();
  const profile = useShipperProfile();
  const preferredProductIds = profile.data?.profile?.product_ids ?? NO_PRODUCTS;
  const [created, setCreated] = useState<{ key: string; preview: ShipperLotPreviewT } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const openedHere = useRef(false);
  const dialogBodyRef = useRef<HTMLDivElement>(null);
  const formKey = catalog.data ? `${orgId}:${catalog.data.id}` : '';
  const result = created?.key === formKey ? created.preview : null;

  const dialogUrl = (isOpen: boolean, registered = false) => {
    const params = new URLSearchParams(searchParams.toString());
    if (isOpen) params.set('new', '1');
    else params.delete('new');
    if (registered) params.set('status', 'registered');
    const query = params.toString();

    return `${SHIPPER_PATHS.LOTS}${query ? `?${query}` : ''}`;
  };

  const setOpen = (isOpen: boolean) => {
    if (isOpen) {
      openedHere.current = true;
      setShowResult(false);
      router.push(dialogUrl(true), { scroll: false });
    } else if (openedHere.current && !showResult) {
      router.back();
    } else {
      router.replace(dialogUrl(false), { scroll: false });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <ShipperPageHeader
        eyebrow="내 출하"
        title="출하 목록"
        sub="등록한 출하를 상태별로 확인하세요. 계획에 배정되기 전까지 수정·취소할 수 있습니다."
      >
        <DialogTrigger asChild>
          <button ref={triggerRef} type="button" className="m2-btn m2-btn-pri">
            새 출하 등록 <ArrowRightIcon size={14} aria-hidden />
          </button>
        </DialogTrigger>
      </ShipperPageHeader>

      <SectionErrorBoundary message="출하 목록을 그리지 못했습니다." className="h-64">
        <LotTable catalog={catalog.data ?? null} />
      </SectionErrorBoundary>

      {result && (
        <details className="m2-card mt-4">
          <summary className="cursor-pointer text-sm font-semibold">최근 등록 결과 보기</summary>
          <div className="mt-4">
            <SeasonNotice preview={result} />
            <IntakeResultCard preview={shipperFacing(result)} />
          </div>
        </details>
      )}

      <DialogContent
        data-ui="m2"
        showCloseButton={false}
        className="flex! max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden bg-[#f8fafc] p-0! sm:max-w-[1040px]!"
        onOpenAutoFocus={event => {
          event.preventDefault();
          dialogTitleRef.current?.focus();
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          openedHere.current = false;
          setShowResult(false);
          triggerRef.current?.focus();
        }}
      >
        <div className="flex shrink-0 items-start gap-4 border-b border-m2-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <DialogTitle
              ref={dialogTitleRef}
              tabIndex={-1}
              className="text-lg font-bold outline-none"
            >
              {showResult && result ? '출하 등록 완료' : '새 출하 등록'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-m2-muted">
              {showResult && result
                ? '출하가 목록에 반영되었습니다. 자동 계산된 판매기한과 운송 가능 여부를 확인하세요.'
                : '품목, 수량, 목적지, 출하 가능일과 출하 장소를 입력하세요.'}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="등록 창 닫기"
              className="m2-btn m2-btn-sec m2-btn-sm shrink-0"
            >
              <XIcon size={16} aria-hidden />
            </button>
          </DialogClose>
        </div>

        <div ref={dialogBodyRef} className="min-h-0 overflow-y-auto overscroll-contain p-4">
          <SectionErrorBoundary message="출하 등록 영역을 그리지 못했습니다." className="min-h-48">
            {showResult && result ? (
              <div className="flex flex-col gap-4">
                <p role="status" className="m2-note mt-0">
                  출하를 등록했습니다.
                </p>
                <SeasonNotice preview={result} />
                <IntakeResultCard preview={shipperFacing(result)} />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="m2-btn m2-btn-sec"
                    onClick={() => setShowResult(false)}
                  >
                    계속 등록
                  </button>
                  <DialogClose asChild>
                    <button type="button" className="m2-btn m2-btn-pri">
                      목록으로
                    </button>
                  </DialogClose>
                </div>
              </div>
            ) : (
              <>
                {catalog.isError && (
                  <QueryError
                    message="품목·출하 장소 정보를 불러오지 못했습니다."
                    onRetry={() => {
                      void catalog.refetch();
                    }}
                    isRetrying={catalog.isFetching}
                  />
                )}
                {catalog.isPending && <CardSkeleton height={480} />}
                {catalog.data && catalog.data.shippers.length === 0 && (
                  <EmptyState
                    title="먼저 출하 장소를 등록하세요"
                    description="출하 등록에 사용할 집하 장소와 취급 품목을 등록하세요."
                    action={{ href: SHIPPER_PATHS.ADD_PACKHOUSE, label: '출하 장소 등록하기' }}
                  />
                )}
                {catalog.data && catalog.data.shippers.length > 0 && (
                  <ShipperLotForm
                    key={`${formKey}:${preferredProductIds.join(',')}`}
                    catalog={catalog.data}
                    className="[&>div.m2-sub]:hidden [&>h2]:hidden"
                    preferredProductIds={preferredProductIds}
                    onCreated={preview => {
                      setCreated({ key: formKey, preview });
                      setShowResult(true);
                      router.replace(dialogUrl(true, true), { scroll: false });
                      requestAnimationFrame(() => {
                        dialogBodyRef.current?.scrollTo({ top: 0 });
                        dialogTitleRef.current?.focus();
                      });
                    }}
                  />
                )}
              </>
            )}
          </SectionErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}
