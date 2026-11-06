'use client';

import { Check, ChevronDown, ChevronRight, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';

import { useLogout, useMe, useSwitchOrg, useSwitchTargetStore } from '@/apis/saas/auth';
import { orgInitials } from '@/app/(saas)/app/_components/org-switcher';
import { SAAS_PAGES, SAAS_ROUTES, roleHome, roleSettings } from '@/consts/route-saas';

export function AccountMenu() {
  const { data: me } = useMe();
  const router = useRouter();
  const switchOrg = useSwitchOrg();
  const logout = useLogout();
  const [switching, setSwitching] = useState(false);
  const [showOrgs, setShowOrgs] = useState(false);

  if (!me) return null;

  const active = me.active_org;

  return (
    <DropdownMenu.Root
      onOpenChange={open => {
        if (!open) setShowOrgs(false);
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          className="m2-account-trigger"
          aria-label={`계정 메뉴 · ${active.org_name}`}
          type="button"
        >
          <span className="m2-av" aria-hidden>
            {orgInitials(active)}
          </span>
          <span className="m2-account-summary">
            <span className="m2-org-nm">{active.org_name}</span>
            <span className="m2-org-rl">
              {me.user.name} · {SAAS_ROUTES[active.org_type].label}
            </span>
          </span>
          <ChevronDown size={15} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-ui="m2"
          className="m2-account-menu"
          align="end"
          sideOffset={8}
          collisionPadding={12}
        >
          <DropdownMenu.Item asChild className="m2-account-item">
            <Link
              href={roleSettings(active.org_type)}
              aria-label="개인 설정 열기"
              style={{ alignItems: 'flex-start', paddingBlock: 14 }}
            >
              <span className="m2-av" aria-hidden>
                {me.user.name.trim().slice(0, 2)}
              </span>
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  gap: 4,
                  overflowWrap: 'anywhere',
                }}
              >
                <strong>{me.user.name}</strong>
                <span style={{ fontSize: 12, color: 'var(--m2-muted)' }}>{me.user.email}</span>
                <small>
                  {active.org_name} · {SAAS_ROUTES[active.org_type].label}
                </small>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 3,
                    fontSize: 12,
                    color: 'var(--m2-brand)',
                  }}
                >
                  개인 설정
                  <ChevronRight size={13} aria-hidden />
                </span>
              </span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="m2-account-separator" />
          {me.memberships.length > 1 ? (
            <DropdownMenu.Item
              className="m2-account-item"
              disabled={switching}
              onSelect={event => {
                event.preventDefault();
                setShowOrgs(!showOrgs);
              }}
              aria-expanded={showOrgs}
            >
              <Settings size={16} aria-hidden />
              업체 전환
              <ChevronRight
                size={14}
                className="ml-auto"
                style={{ transform: showOrgs ? 'rotate(90deg)' : 'none' }}
                aria-hidden
              />
            </DropdownMenu.Item>
          ) : null}
          {me.memberships.length > 1 && showOrgs ? (
            <DropdownMenu.Group>
              <DropdownMenu.Label className="m2-account-label">내 업체</DropdownMenu.Label>
              {me.memberships.map(org => (
                <DropdownMenu.CheckboxItem
                  key={org.org_id}
                  className="m2-account-item"
                  checked={org.org_id === active.org_id}
                  disabled={switching}
                  onSelect={async () => {
                    if (org.org_id === active.org_id) return;
                    setSwitching(true);
                    try {
                      if (await switchOrg(org.org_id)) router.replace(roleHome(org.org_type));
                    } finally {
                      setSwitching(false);
                    }
                  }}
                >
                  <span className="m2-account-check">
                    <DropdownMenu.ItemIndicator>
                      <Check size={14} aria-hidden />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  <span>
                    {org.org_name}
                    <small>{SAAS_ROUTES[org.org_type].label}</small>
                  </span>
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Group>
          ) : null}
          <DropdownMenu.Separator className="m2-account-separator" />
          <DropdownMenu.Item
            className="m2-account-item"
            disabled={logout.isPending}
            onSelect={() => {
              useSwitchTargetStore.getState().setTarget(null);
              router.replace(SAAS_PAGES.LOGIN);
              logout.mutate();
            }}
          >
            <LogOut size={16} aria-hidden />
            {logout.isPending ? '로그아웃 중' : '로그아웃'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
