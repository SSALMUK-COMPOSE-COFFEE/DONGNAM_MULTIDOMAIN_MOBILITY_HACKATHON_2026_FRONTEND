import type { ColdchainTwinT } from '@/apis/saas/coldchain';

type TemperatureProvenancePropsT = {
  twin: Pick<ColdchainTwinT, 'device_ids' | 'has_data'> | null;
  compact?: boolean;
};

const SYNTHETIC_DEVICE_PREFIX = 'synthetic-demo-';

export function TemperatureProvenance({ twin, compact = false }: TemperatureProvenancePropsT) {
  const deviceIds = twin?.device_ids ?? [];
  const hasSynthetic = deviceIds.some(id => id.startsWith(SYNTHETIC_DEVICE_PREFIX));

  if (!twin?.has_data || !hasSynthetic) return null;

  const mixed = deviceIds.some(id => !id.startsWith(SYNTHETIC_DEVICE_PREFIX));
  const label = mixed ? '시연용 온도 기록 포함' : '시연용 온도 기록';
  const badge = <span className="m2-chip m2-chip-brand">{label}</span>;

  if (compact) return badge;

  return (
    <div role="note" className="mb-3 rounded-xl bg-m2-brand-soft px-3 py-2">
      {badge}
      <p className="m2-sub mt-1 text-xs">
        {mixed ? '시연용 기록은 실제 센서 측정값이 아닙니다.' : '실제 센서 측정값이 아닙니다.'}
      </p>
    </div>
  );
}
