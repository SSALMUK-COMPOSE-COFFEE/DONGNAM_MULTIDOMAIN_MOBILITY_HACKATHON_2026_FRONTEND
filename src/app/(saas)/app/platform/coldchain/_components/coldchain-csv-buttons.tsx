'use client';

import { Download } from 'lucide-react';

import { CSV_LABEL, type ColdchainCsvKindT, useDownloadContainerCsv } from '@/apis/saas/coldchain';

const CSV_KINDS: ColdchainCsvKindT[] = ['readings', 'outages'];

type ColdchainCsvButtonsPropsT = {
  planId: string;
  containerId: string;
  hasData: boolean;
};

export function ColdchainCsvButtons({ planId, containerId, hasData }: ColdchainCsvButtonsPropsT) {
  const download = useDownloadContainerCsv(planId, containerId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CSV_KINDS.map(kind => (
        <button
          key={kind}
          type="button"
          className="m2-btn m2-btn-sec m2-btn-sm"
          disabled={!hasData || download.isPending}
          title={
            hasData ? `${containerId} ${CSV_LABEL[kind]}을 CSV로 내려받습니다` : '측정값이 없습니다'
          }
          onClick={() => download.mutate(kind)}
        >
          <Download className="size-3.5" aria-hidden />
          {CSV_LABEL[kind]} CSV
        </button>
      ))}
    </div>
  );
}
