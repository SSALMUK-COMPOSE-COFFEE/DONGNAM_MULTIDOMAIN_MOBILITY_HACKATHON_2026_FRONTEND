'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEMO_INTAKE, DEMO_SCENARIO_ID } from '@/consts/demo';
import type { IntakeRequestT, ScenarioT } from '@/types/api';

export type IntakeFieldErrorT = { field: string; message: string };

type IntakeFormPropsT = {
  scenario: ScenarioT;
  isPending: boolean;
  fieldErrors: IntakeFieldErrorT[];
  onSubmit: (request: IntakeRequestT) => void;
};

/** 화주가 넣는 건 품목·수량·선과장·목적지·출하일 다섯 개뿐이다 */
export function IntakeForm({ scenario, isPending, fieldErrors, onSubmit }: IntakeFormPropsT) {
  const [form, setForm] = useState<IntakeRequestT>({
    ...DEMO_INTAKE,
    sell_window: 'normal',
    scenario_id: DEMO_SCENARIO_ID,
  });
  const update = (patch: Partial<IntakeRequestT>) => setForm(prev => ({ ...prev, ...patch }));

  // 출발항(부산신항)은 목적지에서 뺀다
  const destinationIds = new Set(scenario.voyages.map(({ destination }) => destination));
  const destinations = scenario.ports.filter(({ id }) => destinationIds.has(id));
  const errorOf = (field: string) => fieldErrors.find(error => error.field === field)?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>출하 등록</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            onSubmit(form);
          }}
        >
          <Field label="품목" error={errorOf('product')}>
            <Select value={form.product} onValueChange={product => update({ product })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenario.products.map(({ id, name }) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="수량 (파렛트)" error={errorOf('pallets')}>
            <Input
              type="number"
              min={1}
              className="num"
              value={form.pallets}
              onChange={event => update({ pallets: Number(event.target.value) })}
            />
          </Field>

          <Field label="화주 · 선과장" error={errorOf('shipper')}>
            <Select value={form.shipper} onValueChange={shipper => update({ shipper })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenario.shippers.map(({ id, name, packhouse_id }) => (
                  <SelectItem key={id} value={id}>
                    {name} ·{' '}
                    {scenario.packhouses.find(({ id: phId }) => phId === packhouse_id)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="목적지" error={errorOf('destination')}>
            <Select value={form.destination} onValueChange={destination => update({ destination })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinations.map(({ id, name }) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="출하 가능일" error={errorOf('ready_date')}>
            <Input
              type="date"
              className="num"
              value={form.ready_date}
              onChange={event => update({ ready_date: event.target.value })}
            />
          </Field>

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? '확인 중' : '등록하고 실을 배 확인'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-berry">{error}</p>}
    </div>
  );
}
