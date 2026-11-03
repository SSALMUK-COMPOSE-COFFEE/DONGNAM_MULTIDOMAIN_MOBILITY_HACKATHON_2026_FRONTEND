'use client';

import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';

import { saasErrorDetail } from '@/apis/saas/errors';
import { useCanResetSandbox, useSandboxReset } from '@/apis/saas/sandbox';
import { useRoleSwitchStore } from '@/app/(saas)/app/_components/use-role-switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SAAS_PAGES } from '@/consts/route-saas';

const RESET_COOLDOWN_MS = 60_000;

type CooldownStoreT = {
  until: number;
  setUntil: (until: number) => void;
};

const COOLDOWN_KEY = 'fs.saas.sandbox-reset-until';

const readStoredUntil = () => {
  try {
    return Number(localStorage.getItem(COOLDOWN_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeStoredUntil = (until: number) => {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(until));
  } catch {
    return;
  }
};

const useCooldownStore = create<CooldownStoreT>()(set => ({
  until: 0,
  setUntil: until => {
    writeStoredUntil(until);
    set({ until });
  },
}));

const hydrateCooldown = () => {
  const stored = readStoredUntil();
  if (stored > useCooldownStore.getState().until) useCooldownStore.setState({ until: stored });
};

const useHydratedCooldown = () => {
  useEffect(() => {
    hydrateCooldown();
    const onStorage = (event: StorageEvent) => {
      if (event.key === COOLDOWN_KEY) hydrateCooldown();
    };
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return useCooldownStore(state => state.until);
};

const untilFromResetAt = (resetAt: string) => {
  const now = Date.now();
  const at = Date.parse(resetAt);

  return (Number.isNaN(at) ? now : Math.min(at, now)) + RESET_COOLDOWN_MS;
};

const retryAfterMs = (error: unknown) => {
  if (!isAxiosError(error) || error.response?.status !== 429) return null;

  const header = Number(error.response.headers['retry-after']);
  if (Number.isFinite(header) && header > 0) return header * 1000;

  const match = saasErrorDetail(error)?.match(/(\d+)초/);

  return match ? Number(match[1]) * 1000 : RESET_COOLDOWN_MS;
};

const subscribeTick = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000);

  return () => window.clearInterval(id);
};

const useRemainingSeconds = (until: number) => {
  const getSnapshot = useCallback(
    () => Math.max(0, Math.ceil((until - Date.now()) / 1000)),
    [until]
  );

  return useSyncExternalStore(subscribeTick, getSnapshot, () => 0);
};

export function SandboxResetButton() {
  const router = useRouter();
  const canReset = useCanResetSandbox();
  const reset = useSandboxReset();
  const until = useHydratedCooldown();
  const remaining = useRemainingSeconds(until);

  useEffect(() => {
    if (canReset) router.prefetch(SAAS_PAGES.LOGIN);
  }, [canReset, router]);

  if (!canReset) return null;

  const coolingDown = remaining > 0;
  const idleLabel = coolingDown ? `${remaining}초 뒤 다시 초기화` : '데모 초기화';
  const label = reset.isPending ? '초기화 중' : idleLabel;

  const confirm = () =>
    reset
      .mutateAsync()
      .then(({ reset_at }) => {
        useCooldownStore.getState().setUntil(untilFromResetAt(reset_at));
        useRoleSwitchStore.getState().setTarget(null);
        router.replace(SAAS_PAGES.LOGIN);
      })
      .catch((error: unknown) => {
        const wait = retryAfterMs(error);
        if (wait !== null) useCooldownStore.getState().setUntil(Date.now() + wait);
      });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="m2-sbx-role"
          disabled={reset.isPending || coolingDown}
          title={coolingDown ? `방금 초기화했습니다. ${remaining}초 뒤에 다시 시도하세요` : label}
        >
          {label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>데모 세계를 처음 상태로 되돌릴까요?</AlertDialogTitle>
          <AlertDialogDescription>
            모든 데모 조직의 출하·계획·콜드체인 기록이 처음 상태로 돌아가고, 모든 데모 사용자가
            로그아웃됩니다. 초기화가 끝나면 로그인 화면으로 이동합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm}>
            초기화
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
