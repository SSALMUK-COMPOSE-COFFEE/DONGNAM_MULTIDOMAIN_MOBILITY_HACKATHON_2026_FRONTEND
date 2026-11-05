'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useMe } from '@/apis/saas/auth';
import { saasErrorReason } from '@/apis/saas/errors';
import { useDeleteResource, useResourceOptions, useResources } from '@/apis/saas/resources';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import { ResourceEditor } from '@/app/(saas)/app/forwarder/containers/_components/resource-editor';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ResourceFilters, filterResources } from '@/components/saas-resources/resource-filters';
import { ResourceList, ResourcesSummary } from '@/components/saas-resources/resource-list';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { ResourceT } from '@/types/saas-resources';

export function ForwarderResourcesView() {
  const { data: me } = useMe();
  return <ResourceManager key={me?.active_org.org_id ?? 'loading'} />;
}

function ResourceManager() {
  const resources = useResources('forwarder');
  const options = useResourceOptions();
  const remove = useDeleteResource();
  const [editor, setEditor] = useState<ResourceT | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ResourceT | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = filterResources(resources.data ?? [], query, status);
  return (
    <>
      <ForwarderPageHeader
        eyebrow="포워더"
        title="컨테이너 관리"
        sub="공동적재에 제공할 컨테이너 공간과 항차 일정을 관리하세요."
      >
        <Link href={FORWARDER_PATHS.VOYAGES} className="m2-btn m2-btn-sec">
          항차 설정
        </Link>
        <button
          type="button"
          className="m2-btn m2-btn-pri"
          disabled={!options.isSuccess}
          onClick={() => setEditor('new')}
        >
          <Plus size={16} aria-hidden />
          컨테이너 등록
        </button>
      </ForwarderPageHeader>
      <p className="m2-sub mb-4">
        등록한 자원으로 출하 풀에서 공동적재 배정을 계산합니다. 실제 선사 부킹과 운송 실행은
        포워더가 진행합니다. 모든 일정은 한국 시간(KST)입니다.
      </p>
      {(resources.isPending || options.isPending) && <CardSkeleton height={280} />}
      {resources.isError && (
        <QueryError
          message="컨테이너 제공 정보를 불러오지 못했습니다."
          onRetry={() => resources.refetch()}
          isRetrying={resources.isFetching}
        />
      )}
      {options.isError && (
        <QueryError
          className="mb-4"
          message="항구와 컨테이너 종류를 불러오지 못했습니다."
          onRetry={() => options.refetch()}
          isRetrying={options.isFetching}
        />
      )}
      {resources.isSuccess && options.isSuccess && (
        <>
          <ResourcesSummary resources={resources.data} />
          <p className="m2-note mt-0 mb-4">{options.data.allocation_notice}</p>
          <ResourceFilters
            query={query}
            status={status}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
          />
          {filtered.length > 0 ? (
            <ResourceList
              resources={filtered}
              ports={options.data.ports}
              role="forwarder"
              onEdit={setEditor}
              onDelete={item => {
                remove.reset();
                setDeleting(item);
              }}
            />
          ) : (
            <EmptyState
              title={resources.data.length ? '검색 결과가 없습니다' : '등록한 컨테이너가 없습니다'}
              description={
                resources.data.length
                  ? '검색어나 상태를 바꿔 보세요.'
                  : '제공 가능한 공간과 항차를 등록하면 우리 회사의 공동적재 계산에 사용됩니다.'
              }
            />
          )}
        </>
      )}
      <Dialog
        open={editor !== null}
        onOpenChange={open => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent
          data-ui="m2"
          className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[760px]"
        >
          {editor !== null && options.data && (
            <ResourceEditor
              key={editor === 'new' ? 'new' : editor.id}
              resource={editor === 'new' ? null : editor}
              options={options.data}
              onDone={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={open => {
          if (!open && !remove.isPending) setDeleting(null);
        }}
      >
        <DialogContent data-ui="m2" className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogTitle>컨테이너 제공 정보 삭제</DialogTitle>
          <DialogDescription>
            {deleting?.name} 제공 정보를 삭제하시겠습니까? 플랫폼은 이 자원을 새 계획에 사용할 수
            없게 됩니다.
          </DialogDescription>
          {remove.isError && (
            <p role="alert" className="text-sm text-m2-crit">
              {saasErrorReason(remove.error) ?? '삭제하지 못했습니다. 다시 시도하세요.'}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              취소
            </button>
            <button
              type="button"
              className="m2-btn m2-btn-pri"
              disabled={remove.isPending}
              onClick={() => {
                if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
              }}
            >
              {remove.isPending ? '삭제 중' : '삭제'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
