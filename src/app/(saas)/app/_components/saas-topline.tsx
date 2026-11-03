'use client';

import Link from 'next/link';

import { useMe } from '@/apis/saas/auth';
import { SandboxBanner } from '@/app/(saas)/app/_components/sandbox-banner';
import { SAAS_PAGES, roleHome } from '@/consts/route-saas';

export function SaasTopline() {
  const { data: me } = useMe();
  const home = me ? roleHome(me.active_org.org_type) : SAAS_PAGES.APP;

  return (
    <div className="m2-topline">
      <Link href={home} className="m2-logo">
        프레시스위치
        <span aria-hidden>≈</span>
      </Link>
      <SandboxBanner />
    </div>
  );
}
