'use client';

import { type ReactNode, useId, useState } from 'react';

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
            {field => (
              <Select value={form.product} onValueChange={product => update({ product })}>
                <SelectTrigger className="w-full" {...field}>
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
            )}
          </Field>

          <Field label="수량 (파렛트)" error={errorOf('pallets')}>
            {field => (
              <Input
                {...field}
                type="number"
                min={1}
                className="num"
                value={form.pallets}
                onChange={event => update({ pallets: Number(event.target.value) })}
              />
            )}
          </Field>

          {hideShipperField && errorOf('shipper') && (
            <p role="alert" className="text-sm text-berry">
              {errorOf('shipper')}
            </p>
          )}

          {!hideShipperField && (
            <Field label="화주 · 선과장" error={errorOf('shipper')}>
              {field => (
                <Select value={form.shipper} onValueChange={shipper => update({ shipper })}>
                  <SelectTrigger className="w-full" {...field}>
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
              )}
            </Field>
          )}

          <Field label="목적지" error={errorOf('destination')}>
            {field => (
              <Select
                value={form.destination}
                onValueChange={destination => update({ destination })}
              >
                <SelectTrigger className="w-full" {...field}>
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
            )}
          </Field>

          <Field label="출하 가능일" error={errorOf('ready_date')}>
            {field => (
              <Input
                {...field}
                type="date"
                className="num"
                value={form.ready_date}
                onChange={event => update({ ready_date: event.target.value })}
              />
            )}
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
  const destinationIds = new Set(scenario.voyages.map(({ destination }) => destination));

  return scenario.ports
    .filter(({ id }) => destinationIds.has(id))
    .map(({ id, name }) => ({ id, label: name }));
};

type FieldPropsT = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (field: FieldPropsT) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const field: FieldPropsT = {
    id,
    'aria-invalid': !!error,
    ...(error ? { 'aria-describedby': errorId } : {}),
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(field)}
      {error && (
        <p id={errorId} className="text-sm text-berry">
          {error}
        </p>
      )}
    </div>
  );
}
