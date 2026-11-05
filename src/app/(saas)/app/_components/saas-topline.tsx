'use client';

import Link from 'next/link';

import { useMe } from '@/apis/saas/auth';
import { AccountMenu } from '@/app/(saas)/app/_components/account-menu';
import { MobileNav } from '@/app/(saas)/app/_components/mobile-nav';
import { SAAS_PAGES, roleHome } from '@/consts/route-saas';

export function SaasTopline() {
  const { data: me } = useMe();
  const home = me ? roleHome(me.active_org.org_type) : SAAS_PAGES.APP;

  return (
    <div className="m2-topline">
      <div className="m2-topline-l">
        <MobileNav />
        <Link href={home} className="m2-logo">
          프레시스위치
          <span aria-hidden>≈</span>
        </Link>
      </div>
      <div className="m2-topline-actions">
        <AccountMenu />
      </div>
    </div>
  );
}
