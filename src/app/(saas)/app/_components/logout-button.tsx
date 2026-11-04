'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useLogout, useSwitchTargetStore } from '@/apis/saas/auth';
import { SAAS_PAGES } from '@/consts/route-saas';

export function LogoutButton() {
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    router.prefetch(SAAS_PAGES.LOGIN);
  }, [router]);

  const label = logout.isPending ? '로그아웃 중' : '로그아웃';

  return (
    <button
      type="button"
      className="m2-btn m2-btn-sec m2-btn-sm"
      disabled={logout.isPending}
      aria-label={label}
      title={label}
      onClick={() => {
        useSwitchTargetStore.getState().setTarget(null);
        router.replace(SAAS_PAGES.LOGIN);
        logout.mutate();
      }}
    >
      <LogOut size={14} strokeWidth={1.8} aria-hidden />
      <span className="m2-rail-hide">{label}</span>
    </button>
  );
}
