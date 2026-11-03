'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useLogout } from '@/apis/saas/auth';
import { Button } from '@/components/ui/button';
import { SAAS_PAGES } from '@/consts/route-saas';

export function LogoutButton() {
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    router.prefetch(SAAS_PAGES.LOGIN);
  }, [router]);

  return (
    <Button
      variant="outline"
      disabled={logout.isPending}
      onClick={() => {
        router.replace(SAAS_PAGES.LOGIN);
        logout.mutate();
      }}
    >
      {logout.isPending ? '로그아웃 중' : '로그아웃'}
    </Button>
  );
}
