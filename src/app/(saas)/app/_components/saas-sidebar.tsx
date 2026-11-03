'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMe } from '@/apis/saas/auth';
import { LogoutButton } from '@/app/(saas)/app/_components/logout-button';
import { OrgSwitcher } from '@/app/(saas)/app/_components/org-switcher';
import { SAAS_ROUTES, isActiveMenu } from '@/consts/route-saas';

export function SaasSidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();

  if (!me) return null;

  const route = SAAS_ROUTES[me.active_org.org_type];

  return (
    <aside className="sticky top-0 flex h-dvh w-72 shrink-0 flex-col gap-6 border-r bg-white/85 px-5 py-6 backdrop-blur">
      <Link href={route.home} className="flex items-center gap-2 px-2 text-xl font-black text-navy">
        프레시스위치
        <span className="text-brand">≈</span>
      </Link>

      <OrgSwitcher me={me} />

      <nav className="flex flex-col gap-1">
        {route.menu.map(({ href, label }) => {
          const isActive = isActiveMenu(pathname, href, route.home);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : false}
              className={cn(
                'rounded-xl px-4 py-2.5 text-base font-bold text-muted-foreground hover:bg-panel',
                isActive && 'bg-brand-soft text-navy hover:bg-brand-soft'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t pt-5">
        <div className="px-2">
          <p className="font-bold text-navy">{me.user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{me.user.email}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
