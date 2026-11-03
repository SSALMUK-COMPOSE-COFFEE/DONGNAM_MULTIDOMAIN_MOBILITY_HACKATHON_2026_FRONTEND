'use client';

import { useState } from 'react';

import { useBindDevice, usePlatformPlan, usePlatformPlans } from '@/apis/saas/platform';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BindingStageT, DeviceT } from '@/types/saas-platform';
import { planOptionLabel } from '@/utils/plan-label';

const STAGES: { value: BindingStageT; label: string }[] = [
  { value: 'trucking', label: '집하 트럭' },
  { value: 'gate', label: '터미널 반입' },
  { value: 'terminal', label: '터미널 대기' },
  { value: 'vessel', label: '선적' },
];

export function BindDeviceDialog({ device }: { device: DeviceT }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {device.binding ? '연결 바꾸기' : '컨테이너 연결'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {isOpen && <BindDeviceForm device={device} onDone={() => setIsOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BindDeviceForm({ device, onDone }: { device: DeviceT; onDone: () => void }) {
  const plansQuery = usePlatformPlans();
  const [planId, setPlanId] = useState(device.binding?.plan_id ?? '');
  const [pickedContainerId, setPickedContainerId] = useState(device.binding?.container_id ?? '');
  const [stage, setStage] = useState<BindingStageT>(device.binding?.stage ?? 'terminal');
  const planQuery = usePlatformPlan(planId);
  const bind = useBindDevice();

  const containerIds =
    planQuery.data?.plan.containers
      .filter(({ used }) => used)
      .map(({ container_id }) => container_id) ?? [];
  const containerId = containerIds.includes(pickedContainerId) ? pickedContainerId : '';

  const submit = () =>
    bind.mutate(
      { device_id: device.device_id, plan_id: planId, container_id: containerId, stage },
      { onSuccess: onDone }
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{device.device_id} 컨테이너 연결</DialogTitle>
        <DialogDescription>
          연결하면 이 기기가 보내는 측정값이 고른 계획의 컨테이너 품온 · 전원으로 들어옵니다.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>계획</Label>
          <Select value={planId} onValueChange={setPlanId} disabled={!plansQuery.data?.length}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={plansQuery.isPending ? '불러오는 중' : '계획 선택'} />
            </SelectTrigger>
            <SelectContent>
              {plansQuery.data?.map(plan => (
                <SelectItem key={plan.plan_id} value={plan.plan_id}>
                  {planOptionLabel(plan)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {plansQuery.isError && (
            <p className="text-sm text-destructive">계획 목록을 불러오지 못했습니다.</p>
          )}
          {plansQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">먼저 공동적재 계획을 만드세요.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>컨테이너</Label>
          <Select
            value={containerId}
            onValueChange={setPickedContainerId}
            disabled={containerIds.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={planId ? '컨테이너 선택' : '계획을 먼저 고르세요'} />
            </SelectTrigger>
            <SelectContent>
              {containerIds.map(id => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {planQuery.isError && (
            <p className="text-sm text-destructive">계획을 불러오지 못했습니다.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>구간</Label>
          <Select value={stage} onValueChange={value => setStage(value as BindingStageT)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          취소
        </Button>
        <Button disabled={!planId || !containerId || bind.isPending} onClick={submit}>
          {bind.isPending ? '연결 중' : '연결'}
        </Button>
      </DialogFooter>
    </>
  );
}
