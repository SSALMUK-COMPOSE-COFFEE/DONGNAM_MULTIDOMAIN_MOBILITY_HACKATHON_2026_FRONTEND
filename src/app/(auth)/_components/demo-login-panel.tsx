'use client';

import { cn } from 'cn';
import { useState } from 'react';

import { useDemoLogin } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { ORG_TYPES, SAAS_ROUTES } from '@/consts/route-saas';
import type { OrgType } from '@/types/saas';

const DEMO_DESCRIPTIONS: Record<OrgType, string> = {
  platform: '모든 화주 출하로 공동적재 계획 · 재최적화 · 정산',
  shipper: '출하 5개 항목 등록, 계획 확인 · 확정, 절감액 조회',
  forwarder: '배정된 항차의 실행 지시 확정 · 운송 실행',
};

export function DemoLoginPanel() {
  const demoLogin = useDemoLogin();
  const enterApp = useEnterApp();
  const [chosen, setChosen] = useState<OrgType | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {ORG_TYPES.map(orgType => (
        <button
          key={orgType}
          type="button"
          disabled={demoLogin.isPending}
          onClick={() => {
            setChosen(orgType);
            demoLogin.mutate({ org_type: orgType }, { onSuccess: enterApp });
          }}
          className={cn(
            'flex flex-col items-start gap-1 rounded-xl border bg-white px-5 py-4 text-left transition-colors',
            'hover:border-brand hover:bg-brand-soft disabled:opacity-50'
          )}
        >
          <span className="flex items-center gap-2 text-lg font-bold text-navy">
            {SAAS_ROUTES[orgType].label}
            {demoLogin.isPending && chosen === orgType && (
              <span className="text-sm font-medium text-muted-foreground">들어가는 중</span>
            )}
          </span>
          <span className="text-sm text-muted-foreground">{DEMO_DESCRIPTIONS[orgType]}</span>
        </button>
      ))}

      {demoLogin.isError && (
        <p role="alert" className="text-sm text-berry">
          {authErrorMessage(demoLogin.error, '데모 계정으로 들어가지 못했습니다.')}
        </p>
      )}
    </div>
  );
}
