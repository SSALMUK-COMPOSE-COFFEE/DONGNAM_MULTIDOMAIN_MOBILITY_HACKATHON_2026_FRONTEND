'use client';

import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';

import { isMeQuery, useMe, useSwitchTargetStore } from '@/apis/saas/auth';
import { saasErrorDetail } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import { useCanResetSandbox, useSandboxReset } from '@/apis/saas/sandbox';
import { broadcastSessionChange } from '@/apis/saas/session-sync';
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
import { roleHome } from '@/consts/route-saas';

const RESET_COOLDOWN_MS = 60_000;
const RESET_COPY =
  '이 둘러보기의 출하와 계획을 처음 상태로 되돌립니다. 다른 사람의 둘러보기는 그대로입니다.';

type CooldownStoreT = {
  untilByWorld: Record<string, number>;
  setUntil: (worldId: string, until: number) => void;
};

const cooldownKey = (worldId: string) => `fs.saas.sandbox-reset-until:${worldId}`;

const readStoredUntil = (worldId: string) => {
  try {
    return Number(localStorage.getItem(cooldownKey(worldId))) || 0;
  } catch {
    return 0;
  }
};

const writeStoredUntil = (worldId: string, until: number) => {
  try {
    localStorage.setItem(cooldownKey(worldId), String(until));
  } catch {
    return;
  }
};

const useCooldownStore = create<CooldownStoreT>()(set => ({
  untilByWorld: {},
  setUntil: (worldId, until) => {
    writeStoredUntil(worldId, until);
    set(state => ({ untilByWorld: { ...state.untilByWorld, [worldId]: until } }));
  },
}));

const useHydratedCooldown = (worldId: string | null) => {
  useEffect(() => {
    if (!worldId) return;

    const apply = () => {
      const stored = readStoredUntil(worldId);
      useCooldownStore.setState(state => ({
        untilByWorld: { ...state.untilByWorld, [worldId]: stored },
      }));
    };

    apply();
    const onStorage = (event: StorageEvent) => {
      if (event.key === cooldownKey(worldId)) apply();
    };
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, [worldId]);

  return useCooldownStore(state => (worldId ? (state.untilByWorld[worldId] ?? 0) : 0));
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
  const queryClient = useQueryClient();
  const me = useMe().data ?? null;
  const canReset = useCanResetSandbox();
  const reset = useSandboxReset();
  const worldId = me?.world?.world_id ?? me?.active_org.world_id ?? null;
  const until = useHydratedCooldown(worldId);
  const remaining = useRemainingSeconds(until);

  if (!canReset || !worldId) return null;

  const coolingDown = remaining > 0;
  const idleLabel = coolingDown ? `${remaining}초 뒤 다시 초기화` : '데모 초기화';
  const label = reset.isPending ? '초기화 중' : idleLabel;

  const confirm = () =>
    reset
      .mutateAsync()
      .then(result => {
        const resetWorldId = result.world_id || worldId;
        useCooldownStore.getState().setUntil(resetWorldId, untilFromResetAt(result.reset_at));
        useSwitchTargetStore.getState().setTarget(null);
        queryClient.removeQueries({
          queryKey: orgKeys.all,
          predicate: query => !isMeQuery(query.queryKey),
        });
        broadcastSessionChange('reset', resetWorldId);
        router.replace(roleHome('platform'));
      })
      .catch((error: unknown) => {
        const wait = retryAfterMs(error);
        if (wait !== null) useCooldownStore.getState().setUntil(worldId, Date.now() + wait);
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
          <AlertDialogTitle>이 둘러보기를 처음 상태로 되돌릴까요?</AlertDialogTitle>
          <AlertDialogDescription>{RESET_COPY}</AlertDialogDescription>
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
