'use client';

import {
  BadgeCheck,
  ClipboardList,
  FileText,
  House,
  Layers,
  type LucideIcon,
  MessageSquareReply,
  Package,
  Rows3,
  Ship,
  Smartphone,
  Thermometer,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMe } from '@/apis/saas/auth';
import { useForwarderPlans } from '@/apis/saas/forwarder';
import { usePlatformLots, usePlatformPlans } from '@/apis/saas/platform';
import { useShipperLots } from '@/apis/saas/shipper';
import { LogoutButton } from '@/app/(saas)/app/_components/logout-button';
import { OrgSwitcher } from '@/app/(saas)/app/_components/org-switcher';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import {
  SAAS_ROUTES,
  type SaasMenuCountKeyT,
  type SaasMenuIconT,
  type SaasMenuItemT,
  type SaasRoleRouteT,
  isActiveMenu,
} from '@/consts/route-saas';
import type { OrgType } from '@/types/saas';

const MENU_ICONS: Record<SaasMenuIconT, LucideIcon> = {
  plans: Layers,
  pool: Rows3,
  coldchain: Thermometer,
  settlement: FileText,
  device: Smartphone,
  home: House,
  lots: Package,
  confirm: BadgeCheck,
  requests: MessageSquareReply,
  voyages: Ship,
  orders: ClipboardList,
};

const ROLE_FOOT_NOTES: Record<OrgType, string | null> = {
  platform: null,
  shipper: null,
  forwarder: '정산 금액은 플랫폼·화주에게만 보입니다.',
};

type MenuCountsT = Partial<Record<SaasMenuCountKeyT, number | null>>;

const countOf = (query: { data?: readonly unknown[] | null; isSuccess: boolean }) =>
  query.isSuccess && query.data ? query.data.length : null;

export function SaasSidebar() {
  return (
    <aside className="m2-side" aria-label="주 메뉴">
      <SaasSidebarBody />
    </aside>
  );
}

export function SaasSidebarBody() {
  const { data: me } = useMe();

  if (!me) return null;

  const orgType = me.active_org.org_type;
  const footNote = ROLE_FOOT_NOTES[orgType];

  return (
    <div className="m2-side-in">
      <OrgSwitcher me={me} />

      {orgType === 'platform' ? <PlatformNav /> : null}
      {orgType === 'shipper' ? <ShipperNav /> : null}
      {orgType === 'forwarder' ? <ForwarderNav /> : null}

      <div className="m2-foot">
        {footNote ? <p className="m2-foot-note">{footNote}</p> : null}
        <div className="m2-user">
          <div className="m2-user-text min-w-0">
            <p className="m2-user-nm">{me.user.name}</p>
            <p className="m2-user-em">{me.user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function PlatformNav() {
  const registeredLots = usePlatformLots('registered');
  const plans = usePlatformPlans();

  return (
    <SidebarNav
      route={SAAS_ROUTES.platform}
      counts={{
        platformRegisteredLots: countOf(registeredLots),
        platformPlans: countOf(plans),
      }}
    />
  );
}

function ShipperNav() {
  const registeredLots = useShipperLots({ status: 'registered' });
  const tasks = useShipperTasks();
  const tasksReady = tasks.plans.isSuccess && !tasks.isOrdersLoading && !tasks.isOrdersError;

  return (
    <SidebarNav
      route={SAAS_ROUTES.shipper}
      counts={{
        shipperRegisteredLots: countOf(registeredLots),
        shipperPendingConfirmations: tasksReady ? tasks.confirmations.length : null,
        shipperPendingRequests: tasksReady ? tasks.requests.length : null,
      }}
    />
  );
}

function ForwarderNav() {
  const plans = useForwarderPlans();

  return <SidebarNav route={SAAS_ROUTES.forwarder} counts={{ forwarderPlans: countOf(plans) }} />;
}

type MenuGroupT = { section: string | null; items: SaasMenuItemT[] };

const groupMenu = (menu: readonly SaasMenuItemT[]) =>
  menu.reduce<MenuGroupT[]>((groups, item) => {
    const section = item.section ?? null;
    const last = groups.at(-1);
    if (last && last.section === section) {
      last.items.push(item);
      return groups;
    }

    return [...groups, { section, items: [item] }];
  }, []);

function SidebarNav({ route, counts }: { route: SaasRoleRouteT; counts: MenuCountsT }) {
  const pathname = usePathname();

  return (
    <>
      {groupMenu(route.menu).map(group => (
        <div key={group.section ?? 'menu'}>
          {group.section ? <div className="m2-nav-l">{group.section}</div> : null}
          <nav className="m2-nav" aria-label={group.section ?? route.label}>
            {group.items.map(item => {
              const Icon = MENU_ICONS[item.icon];
              const isActive = isActiveMenu(pathname, item.href, route.home);
              const count = item.countKey ? (counts[item.countKey] ?? null) : null;
              const showCount = count !== null && count > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : false}
                  aria-label={showCount ? `${item.label} ${count}건` : item.label}
                  title={item.label}
                >
                  <Icon size={18} strokeWidth={1.6} aria-hidden />
                  <span className="m2-nav-t">{item.label}</span>
                  {showCount ? (
                    <i className={item.countStrong ? 'm2-cnt is-strong' : 'm2-cnt'}>{count}</i>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
