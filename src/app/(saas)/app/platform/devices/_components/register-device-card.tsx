'use client';

import { CopyIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { useIsSandbox } from '@/apis/saas/auth';
import { saasErrorDetail, saasErrorReason, saasErrorStatus } from '@/apis/saas/errors';
import { useRegisterDevice } from '@/apis/saas/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEMO_DEVICE_PREFIX } from '@/consts/sandbox-saas';
import type { RegisteredDeviceT } from '@/types/saas-platform';

const registerErrorMessage = (error: unknown) => {
  const status = saasErrorStatus(error);
  if (status === 409)
    return saasErrorDetail(error) ?? '이미 등록됐거나 다른 조직에 연결된 기기 ID 입니다.';
  if (status === 422) return saasErrorDetail(error) ?? '기기 ID를 확인하세요.';

  return saasErrorReason(error) ?? '기기를 등록하지 못했습니다.';
};

export function RegisterDeviceCard() {
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [issued, setIssued] = useState<RegisteredDeviceT | null>(null);
  const register = useRegisterDevice();
  const isSandbox = useIsSandbox();
  const trimmedId = deviceId.trim();
  const prefixBlocked =
    isSandbox &&
    !!trimmedId &&
    !trimmedId.toLowerCase().startsWith(DEMO_DEVICE_PREFIX.toLowerCase());

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedId || prefixBlocked) return;

    register.mutate(
      { device_id: trimmedId, name: name.trim() || null },
      {
        onSuccess: device => {
          setIssued(device);
          setDeviceId('');
          setName('');
        },
      }
    );
  };

  const copyToken = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.device_token);
      toast.success('토큰을 복사했습니다.');
    } catch {
      toast.error('복사하지 못했습니다. 직접 선택해 복사하세요.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>기기 등록</CardTitle>
        <CardDescription>
          센서 일련번호를 등록하면 기기 토큰이 한 번만 발급됩니다. 기기는 측정값을 보낼 때
          <code className="mx-1 rounded bg-panel px-1.5 py-0.5 text-xs">X-Device-Token</code>
          헤더에 이 토큰을 넣습니다.
          {isSandbox && (
            <span className="mt-1 block">
              데모 환경에서는{' '}
              <code className="rounded bg-panel px-1.5 py-0.5 text-xs">{DEMO_DEVICE_PREFIX}</code>로
              시작하는 기기 ID만 등록할 수 있습니다.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="device-id">기기 ID</Label>
            <Input
              id="device-id"
              value={deviceId}
              onChange={event => setDeviceId(event.target.value)}
              placeholder={isSandbox ? `${DEMO_DEVICE_PREFIX}arduino-02` : 'arduino-02'}
              maxLength={100}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="device-name">이름 (선택)</Label>
            <Input
              id="device-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="CA-01 리퍼 센서"
              maxLength={200}
            />
          </div>
          <Button type="submit" disabled={!trimmedId || prefixBlocked || register.isPending}>
            {register.isPending ? '등록 중' : '등록'}
          </Button>
        </form>
        {prefixBlocked && (
          <p className="mt-3 text-sm text-destructive">
            데모 환경의 기기 ID는 {DEMO_DEVICE_PREFIX} 로 시작해야 합니다.
          </p>
        )}
        {register.isError && !prefixBlocked && (
          <p className="mt-3 text-sm text-destructive">{registerErrorMessage(register.error)}</p>
        )}
      </CardContent>

      <Dialog open={!!issued} onOpenChange={isOpen => !isOpen && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{issued?.device_id} 기기 토큰</DialogTitle>
            <DialogDescription>
              이 창을 닫으면 토큰을 다시 볼 수 없습니다. 지금 기기 설정에 넣어 두세요. 잃어버리면
              기기를 삭제하고 다시 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-panel px-3 py-2 text-sm break-all select-all">
              {issued?.device_token}
            </code>
            <Button size="icon" variant="outline" aria-label="토큰 복사" onClick={copyToken}>
              <CopyIcon />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setIssued(null)}>저장했습니다</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
