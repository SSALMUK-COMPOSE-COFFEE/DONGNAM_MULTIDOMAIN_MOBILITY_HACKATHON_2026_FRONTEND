'use client';

import { isAxiosError } from 'axios';
import { cn } from 'cn';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  useCreatePlatformPlan,
  usePlatformCatalog,
  usePlatformLots,
  usePlatformPlans,
} from '@/apis/saas/platform';
import { portNameOf, productNameOf } from '@/app/(saas)/app/platform/_components/catalog-names';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import {
  LOT_STATUS_LABEL,
  LotStatusBadge,
} from '@/app/(saas)/app/platform/_components/lot-status-badge';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { StatTile } from '@/app/(saas)/app/platform/_components/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LotStatusT, PlatformLotT } from '@/types/saas-platform';
import { formatMonthDay } from '@/utils/format';

type FilterT = LotStatusT | 'all';

const FILTERS: FilterT[] = ['registered', 'planned', 'shipped', 'cancelled', 'all'];
const FILTER_LABEL: Record<FilterT, string> = { ...LOT_STATUS_LABEL, all: '전체' };

const sumPallets = (lots: PlatformLotT[]) =>
  lots.reduce((total, { pallets }) => total + pallets, 0);

const errorDetail = (error: unknown) => {
  if (!isAxiosError(error)) return null;
  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;

  return typeof detail === 'string' ? detail : null;
};

export function LotPoolView() {
  const lotsQuery = usePlatformLots();
  const plansQuery = usePlatformPlans();
  const { data: catalog } = usePlatformCatalog();
  const [filter, setFilter] = useState<FilterT>('registered');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const router = useRouter();
  const createPlan = useCreatePlatformPlan();

  const lots = useMemo(() => lotsQuery.data ?? [], [lotsQuery.data]);
  const registered = useMemo(() => lots.filter(({ status }) => status === 'registered'), [lots]);
  const visible = filter === 'all' ? lots : lots.filter(({ status }) => status === filter);
  const selectedLots = registered.filter(({ id }) => selected.has(id));
  const shipperCount = new Set(lots.map(({ shipper_org_id }) => shipper_org_id)).size;
  const unassignedPlans = plansQuery.data?.filter(({ forwarder }) => !forwarder).length;

  const toggle = (lotId: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);

      return next;
    });

  const isAllSelected = registered.length > 0 && selectedLots.length === registered.length;
  const toggleAll = () =>
    setSelected(isAllSelected ? new Set() : new Set(registered.map(({ id }) => id)));

  const submit = () =>
    createPlan.mutate(
      { lot_ids: selectedLots.map(({ id }) => id) },
      {
        onSuccess: session => {
          setSelected(new Set());
          toast.success('공동적재 계획을 만들었습니다.');
          router.push(PLATFORM_PATHS.PLAN(session.plan_id));
        },
        onError: error => toast.error(errorDetail(error) ?? '계획을 만들지 못했습니다.'),
      }
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-6">
        <StatTile
          label="계획을 기다리는 출하"
          value={lotsQuery.isSuccess ? registered.length : '–'}
          unit="건"
          note={lotsQuery.isSuccess ? `${sumPallets(registered)}파렛트` : ''}
        />
        <StatTile
          label="전체 출하"
          value={lotsQuery.isSuccess ? lots.length : '–'}
          unit="건"
          note={lotsQuery.isSuccess ? `화주 ${shipperCount}곳` : ''}
        />
        <StatTile
          label="공동적재 계획"
          value={plansQuery.isSuccess ? plansQuery.data.length : '–'}
          unit="개"
        />
        <StatTile
          label="포워더 미배정 계획"
          value={unassignedPlans ?? '–'}
          unit="개"
          note="계획 상세에서 배정합니다"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>전체 화주 출하 풀</CardTitle>
          <Tabs value={filter} onValueChange={value => setFilter(value as FilterT)}>
            <TabsList>
              {FILTERS.map(value => (
                <TabsTrigger key={value} value={value}>
                  {FILTER_LABEL[value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <LotPoolBody
            isPending={lotsQuery.isPending}
            error={lotsQuery.isError ? lotsQuery.error : null}
            onRetry={() => lotsQuery.refetch()}
            isRetrying={lotsQuery.isFetching}
            lots={visible}
            isEmptyPool={lots.length === 0}
            renderRow={lot => (
              <TableRow key={lot.id} className={cn(selected.has(lot.id) && 'bg-brand-soft/60')}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`${lot.id} 선택`}
                    className="size-4 accent-brand"
                    disabled={lot.status !== 'registered'}
                    checked={selected.has(lot.id)}
                    onChange={() => toggle(lot.id)}
                  />
                </TableCell>
                <TableCell className="font-bold">{lot.shipper_org_name}</TableCell>
                <TableCell>{productNameOf(catalog, lot.product_id)}</TableCell>
                <TableCell className="text-right num">{lot.pallets}</TableCell>
                <TableCell className="num">{formatMonthDay(lot.ready_date)}</TableCell>
                <TableCell className="num">
                  {formatMonthDay(lot.sell_by_date)}
                  {lot.sell_window === 'short' && (
                    <span className="ml-1 text-xs font-bold text-air">짧음</span>
                  )}
                </TableCell>
                <TableCell>{portNameOf(catalog, lot.destination)}</TableCell>
                <TableCell>
                  <LotStatusBadge status={lot.status} />
                </TableCell>
              </TableRow>
            )}
            header={
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="등록된 출하 모두 선택"
                    className="size-4 accent-brand"
                    disabled={registered.length === 0}
                    checked={isAllSelected}
                    onChange={toggleAll}
                  />
                </TableHead>
                <TableHead>화주</TableHead>
                <TableHead>품목</TableHead>
                <TableHead className="text-right">파렛트</TableHead>
                <TableHead>출하 준비일</TableHead>
                <TableHead>판매기한</TableHead>
                <TableHead>목적지</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            }
          />

          <div className="flex items-center justify-between gap-4 rounded-xl bg-navy px-6 py-4 text-white">
            <p className="text-lg">
              선택한 출하 <span className="font-bold num">{selectedLots.length}</span>건 ·{' '}
              <span className="font-bold num">{sumPallets(selectedLots)}</span>파렛트 · 화주{' '}
              <span className="font-bold num">
                {new Set(selectedLots.map(({ shipper_org_id }) => shipper_org_id)).size}
              </span>
              곳
            </p>
            <Button
              size="lg"
              variant="secondary"
              disabled={selectedLots.length === 0 || createPlan.isPending}
              onClick={submit}
            >
              {createPlan.isPending ? '계획 짜는 중' : '선택한 출하로 공동적재 계획 만들기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type LotPoolBodyPropsT = {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
  lots: PlatformLotT[];
  isEmptyPool: boolean;
  header: ReactNode;
  renderRow: (lot: PlatformLotT) => ReactNode;
};

function LotPoolBody({
  isPending,
  error,
  onRetry,
  isRetrying,
  lots,
  isEmptyPool,
  header,
  renderRow,
}: LotPoolBodyPropsT) {
  if (error) {
    return (
      <QueryError error={error} subject="출하 목록을" onRetry={onRetry} isRetrying={isRetrying} />
    );
  }
  if (isPending) return <Skeleton className="h-72" />;
  if (isEmptyPool) {
    return (
      <EmptyState
        title="아직 등록된 출하가 없습니다"
        description="화주가 출하 5개 항목을 등록하면 여기에 모입니다."
      />
    );
  }
  if (lots.length === 0) return <EmptyState title="이 상태의 출하가 없습니다" />;

  return (
    <Table>
      <TableHeader>{header}</TableHeader>
      <TableBody>{lots.map(renderRow)}</TableBody>
    </Table>
  );
}
