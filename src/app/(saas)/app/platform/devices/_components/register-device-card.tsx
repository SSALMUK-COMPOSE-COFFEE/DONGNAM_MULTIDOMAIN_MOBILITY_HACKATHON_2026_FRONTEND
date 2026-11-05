'use client';

import { CopyIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { useIsSandbox } from '@/apis/saas/auth';
import { saasErrorDetail, saasErrorReason, saasErrorStatus } from '@/apis/saas/errors';
import { useRegisterDevice } from '@/apis/saas/platform';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RegisteredDeviceT } from '@/types/saas-platform';

const registerErrorMessage = (error: unknown) => {
  const status = saasErrorStatus(error);
  if (status === 409)
    return saasErrorDetail(error) ?? '이미 등록됐거나 다른 업체에 연결된 기기 ID 입니다.';
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedId) return;

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
    <section className="m2-card">
      <div className="mb-4">
        <h2 className="m2-h2">기기 등록</h2>
        <div className="m2-sub">
          센서 일련번호를 등록하면 기기 토큰이 한 번만 발급됩니다. 기기는 측정값을 보낼 때
          <code className="m2-mono mx-1 rounded-[6px] bg-[rgba(15,27,51,0.05)] px-1.5 py-0.5">
            X-Device-Token
          </code>
          헤더에 이 토큰을 넣습니다.
          {isSandbox && (
            <span className="mt-1 block">
              기기 id는 서버가 이 둘러보기 전용으로 붙입니다. demo- 는 있어도 되고 없어도 됩니다.
            </span>
          )}
        </div>
      </div>
      <div>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="m2-field mb-0 min-w-[200px] flex-1">
            <label htmlFor="device-id">기기 ID</label>
            <input
              id="device-id"
              className="m2-inp"
              value={deviceId}
              onChange={event => setDeviceId(event.target.value)}
              placeholder={isSandbox ? 'sensor-1' : 'arduino-02'}
              maxLength={100}
              required
            />
          </div>
          <div className="m2-field mb-0 min-w-[200px] flex-1">
            <label htmlFor="device-name">이름 (선택)</label>
            <input
              id="device-name"
              className="m2-inp"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="CA-01 리퍼 센서"
              maxLength={200}
            />
          </div>
          <button
            type="submit"
            className="m2-btn m2-btn-pri"
            disabled={!trimmedId || register.isPending}
          >
            {register.isPending ? '등록 중' : '등록'}
          </button>
        </form>
        {register.isError && (
          <p className="mt-3 text-[12.5px] text-m2-crit" role="alert">
            {registerErrorMessage(register.error)}
          </p>
        )}
      </div>

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
    </section>
  );
}
