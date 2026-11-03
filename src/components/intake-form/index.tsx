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

export type IntakeOptionT = { id: string; label: string };

export type IntakeFormOptionsT = {
  products: IntakeOptionT[];
  shippers: IntakeOptionT[];
  destinations: IntakeOptionT[];
};

type IntakeFormPropsT = {
  scenario: ScenarioT;
  isPending: boolean;
  fieldErrors: IntakeFieldErrorT[];
  onSubmit: (request: IntakeRequestT) => void;
  initialValues?: Partial<IntakeRequestT>;
  options?: Partial<IntakeFormOptionsT>;
  hideShipperField?: boolean;
};

/** 화주가 넣는 건 품목·수량·선과장·목적지·출하일 다섯 개뿐이다 */
export function IntakeForm({
  scenario,
  isPending,
  fieldErrors,
  onSubmit,
  initialValues,
  options,
  hideShipperField = false,
}: IntakeFormPropsT) {
  const products = options?.products ?? toProductOptions(scenario);
  const shippers = options?.shippers ?? toShipperOptions(scenario);
  const destinations = options?.destinations ?? toDestinationOptions(scenario);

  const [form, setForm] = useState<IntakeRequestT>(() => {
    const base: IntakeRequestT = {
      ...DEMO_INTAKE,
      sell_window: 'normal',
      scenario_id: DEMO_SCENARIO_ID,
      ...initialValues,
    };

    return {
      ...base,
      product: pickOption(options?.products, base.product),
      shipper: pickOption(options?.shippers, base.shipper),
      destination: pickOption(options?.destinations, base.destination),
    };
  });
  const update = (patch: Partial<IntakeRequestT>) => setForm(prev => ({ ...prev, ...patch }));

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
                {products.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
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

          {hideShipperField && errorOf('shipper') && (
            <p className="text-sm text-berry">{errorOf('shipper')}</p>
          )}

          {!hideShipperField && (
            <Field label="화주 · 선과장" error={errorOf('shipper')}>
              <Select value={form.shipper} onValueChange={shipper => update({ shipper })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shippers.map(({ id, label }) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="목적지" error={errorOf('destination')}>
            <Select value={form.destination} onValueChange={destination => update({ destination })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinations.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
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

const pickOption = (list: IntakeOptionT[] | undefined, current: string): string =>
  !list || list.some(({ id }) => id === current) ? current : (list[0]?.id ?? current);

const toProductOptions = (scenario: ScenarioT): IntakeOptionT[] =>
  scenario.products.map(({ id, name }) => ({ id, label: name }));

const toShipperOptions = (scenario: ScenarioT): IntakeOptionT[] =>
  scenario.shippers.map(({ id, name, packhouse_id }) => ({
    id,
    label: `${name} · ${scenario.packhouses.find(({ id: phId }) => phId === packhouse_id)?.name ?? ''}`,
  }));

const toDestinationOptions = (scenario: ScenarioT): IntakeOptionT[] => {
  // 출발항(부산신항)은 목적지에서 뺀다
  const destinationIds = new Set(scenario.voyages.map(({ destination }) => destination));

  return scenario.ports
    .filter(({ id }) => destinationIds.has(id))
    .map(({ id, name }) => ({ id, label: name }));
};

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
