import type { ReactNode } from 'react';

type PlatformHeaderPropsT = {
  eyebrow: string;
  headline: string;
  highlight?: string;
  children?: ReactNode;
};

export function PlatformHeader({ eyebrow, headline, highlight, children }: PlatformHeaderPropsT) {
  return (
    <div className="mb-8 flex items-end gap-6">
      <div className="flex flex-1 flex-col gap-3">
        <span className="text-lg font-bold text-muted-foreground">{eyebrow}</span>
        <h1 className="text-5xl leading-tight font-black tracking-tight">
          {headline}
          {highlight && <span className="text-brand"> {highlight}</span>}
        </h1>
      </div>
      {children}
    </div>
  );
}
