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
import { Fragment, useSyncExternalStore } from 'react';

import { useMe } from '@/apis/saas/auth';
import { useForwarderPlans } from '@/apis/saas/forwarder';
import { usePlatformLots, usePlatformPlans } from '@/apis/saas/platform';
import { useShipperLots } from '@/apis/saas/shipper';
import { useShipperPlanConfirmations } from '@/apis/saas/shipper-confirm';
import { LogoutButton } from '@/app/(saas)/app/_components/logout-button';
import { OrgSwitcher } from '@/app/(saas)/app/_components/org-switcher';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

const RAIL_QUERY = '(max-width: 1180px)';

const subscribeRail = (onChange: () => void) => {
  const query = window.matchMedia(RAIL_QUERY);
  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
};

const useIsRail = () =>
  useSyncExternalStore(
    subscribeRail,
    () => window.matchMedia(RAIL_QUERY).matches,
    () => false
  );

type MenuCountsT = Partial<Record<SaasMenuCountKeyT, number | null>>;

const countOf = (query: { data?: readonly unknown[] | null; isSuccess: boolean }) =>
  query.isSuccess && query.data ? query.data.length : null;

export function SaasSidebar() {
  return (
    <aside className="m2-side" aria-label="주 메뉴">
      <SaasSidebarBody railTips />
    </aside>
  );
}

export function SaasSidebarBody({ railTips = false }: { railTips?: boolean }) {
  const { data: me } = useMe();

  if (!me) return null;

  const orgType = me.active_org.org_type;
  const footNote = ROLE_FOOT_NOTES[orgType];

  return (
    <div className="m2-side-in">
      <OrgSwitcher me={me} />

      {orgType === 'platform' ? <PlatformNav railTips={railTips} /> : null}
      {orgType === 'shipper' ? <ShipperNav railTips={railTips} /> : null}
      {orgType === 'forwarder' ? <ForwarderNav railTips={railTips} /> : null}

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

type RailTipsPropsT = { railTips: boolean };

function PlatformNav({ railTips }: RailTipsPropsT) {
  const registeredLots = usePlatformLots('registered');
  const plans = usePlatformPlans();

  return (
    <SidebarNav
      route={SAAS_ROUTES.platform}
      railTips={railTips}
      counts={{
        platformRegisteredLots: countOf(registeredLots),
        platformPlans: countOf(plans),
      }}
    />
  );
}

function ShipperNav({ railTips }: RailTipsPropsT) {
  const registeredLots = useShipperLots({ status: 'registered' });
  const tasks = useShipperTasks();
  const planConfirmations = useShipperPlanConfirmations('pending');
  const tasksReady = tasks.plans.isSuccess && !tasks.isOrdersLoading && !tasks.isOrdersError;
  const confirmPlanCount = planConfirmations.isSuccess
    ? new Set(planConfirmations.data.map(({ plan_id }) => plan_id)).size
    : 0;

  return (
    <SidebarNav
      route={SAAS_ROUTES.shipper}
      railTips={railTips}
      counts={{
        shipperRegisteredLots: countOf(registeredLots),
        shipperPendingConfirmations: tasksReady
          ? tasks.confirmations.length + confirmPlanCount
          : null,
        shipperPendingRequests: tasksReady ? tasks.requests.length : null,
      }}
    />
  );
}

function ForwarderNav({ railTips }: RailTipsPropsT) {
  const plans = useForwarderPlans();

  return (
    <SidebarNav
      route={SAAS_ROUTES.forwarder}
      railTips={railTips}
      counts={{ forwarderPlans: countOf(plans) }}
    />
  );
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

type SidebarNavPropsT = { route: SaasRoleRouteT; counts: MenuCountsT; railTips: boolean };

function SidebarNav({ route, counts, railTips }: SidebarNavPropsT) {
  const pathname = usePathname();
  const isRail = useIsRail();
  const showTips = railTips && isRail;

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
              const fullLabel = showCount ? `${item.label} ${count}건` : item.label;
              const link = (
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : false}
                  {...(railTips ? { 'aria-label': fullLabel } : {})}
                  {...(railTips ? {} : { title: item.label })}
                >
                  <Icon size={18} strokeWidth={1.6} aria-hidden />
                  <span className="m2-nav-t">{item.label}</span>
                  {showCount ? (
                    <i className={item.countStrong ? 'm2-cnt is-strong' : 'm2-cnt'}>
                      {count}
                      <span className="sr-only">건</span>
                    </i>
                  ) : null}
                </Link>
              );

              if (!showTips) return <Fragment key={item.href}>{link}</Fragment>;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <span>{link}</span>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} aria-hidden>
                    {fullLabel}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
