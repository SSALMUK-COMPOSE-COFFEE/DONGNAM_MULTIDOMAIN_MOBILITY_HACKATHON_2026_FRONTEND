'use client';

import { Check } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

import { Select, SelectContent, SelectTrigger } from '@/components/ui/select';
import type { ShipperPlanItemT } from '@/types/saas-shipper';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL, planOptionLabel } from '@/utils/plan-label';

type ColdchainPlanSelectPropsT = {
  plans: ShipperPlanItemT[];
  planId: string;
  onValueChange: (value: string) => void;
};

export function ColdchainPlanSelect({ plans, planId, onValueChange }: ColdchainPlanSelectPropsT) {
  const selected = plans.find(plan => plan.plan_id === planId);
  const fullLabel = selected ? planOptionLabel(selected) : planId;

  return (
    <div className="min-w-0">
      <Select value={planId} onValueChange={onValueChange}>
        <SelectTrigger
          aria-label="계획"
          aria-describedby="coldchain-plan-description"
          title={fullLabel}
          className="w-full max-w-full min-w-0 rounded-xl bg-white"
          style={{ height: 'auto', minHeight: 44, width: '100%', whiteSpace: 'normal' }}
        >
          <span className="min-w-0 flex-1 text-left" style={{ overflowWrap: 'anywhere' }}>
            <span className="block font-semibold">
              {selected?.vessel ?? (selected ? NO_VESSEL_LABEL : planId)}
            </span>
            {selected?.departure ? (
              <span className="mt-1 block text-xs text-m2-muted">
                {formatKstMonthDayTime(selected.departure)} 출항
              </span>
            ) : null}
          </span>
        </SelectTrigger>
        <SelectContent>
          {plans.map(plan => (
            <SelectPrimitive.Item
              key={plan.plan_id}
              value={plan.plan_id}
              textValue={planOptionLabel(plan)}
              className="relative min-w-0 cursor-default rounded-md py-3 pr-8 pl-3 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=checked]:font-semibold"
            >
              <SelectPrimitive.ItemText>
                <span
                  style={{
                    display: 'block',
                    minWidth: 0,
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <span className="block">{plan.vessel ?? NO_VESSEL_LABEL}</span>
                  <span className="mt-1 block text-xs text-m2-muted">
                    {formatKstMonthDayTime(plan.departure)} 출항
                  </span>
                  <span className="mt-1 block text-xs font-normal text-m2-muted">
                    {formatKstMonthDayTime(plan.created_at)} 생성 · {plan.plan_id.slice(0, 6)}
                  </span>
                </span>
              </SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className="absolute top-3.5 right-2">
                <Check size={15} aria-hidden />
              </SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
          ))}
          {!selected ? (
            <SelectPrimitive.Item
              value={planId}
              className="p-3 text-sm"
              style={{ overflowWrap: 'anywhere' }}
            >
              <SelectPrimitive.ItemText>{planId}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ) : null}
        </SelectContent>
      </Select>
      <span id="coldchain-plan-description" className="sr-only">
        {fullLabel}
      </span>
    </div>
  );
}
