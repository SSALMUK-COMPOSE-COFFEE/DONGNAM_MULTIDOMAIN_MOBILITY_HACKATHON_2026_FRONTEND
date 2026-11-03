'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { type MouseEvent, useState } from 'react';

import { useMe } from '@/apis/saas/auth';
import { SaasSidebarBody } from '@/app/(saas)/app/_components/saas-sidebar';

export function MobileNav() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const viewKey = `${me?.active_org.org_id ?? ''}|${pathname}`;

  if (openKey !== null && openKey !== viewKey) setOpenKey(null);

  if (!me) return null;

  const isOpen = openKey === viewKey;
  const setIsOpen = (open: boolean) => setOpenKey(open ? viewKey : null);

  const closeOnLink = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) setIsOpen(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="m2-mnav-btn" aria-label="메뉴 열기">
          <Menu size={18} strokeWidth={1.8} aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="m2-mnav-overlay" />
        <Dialog.Content data-ui="m2" className="m2-mnav-sheet" onClick={closeOnLink}>
          <div className="m2-mnav-head">
            <Dialog.Title className="m2-mnav-title">메뉴</Dialog.Title>
            <Dialog.Description className="sr-only">
              {me.active_org.org_name} 메뉴와 계정
            </Dialog.Description>
            <Dialog.Close asChild>
              <button type="button" className="m2-mnav-btn" aria-label="메뉴 닫기">
                <X size={18} strokeWidth={1.8} aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div className="m2-mnav-body">
            <SaasSidebarBody />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
