import type { ReactNode } from 'react';

type StatTilePropsT = {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
};

export function StatTile({ label, value, unit, note }: StatTilePropsT) {
  return (
    <div className="m2-card">
      <div className="m2-lbl">{label}</div>
      <div className="m2-big mt-1.5 text-[30px]">
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      {note ? <div className="m2-sub">{note}</div> : null}
    </div>
  );
}
