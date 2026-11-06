import type { ReactNode } from 'react';

type ShipperPageHeaderPropsT = {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
};

export function ShipperPageHeader({ eyebrow, title, sub, children }: ShipperPageHeaderPropsT) {
  return (
    <div className="m2-head max-[720px]:flex-col max-[720px]:items-start">
      <div className="min-w-0">
        <div className="m2-eyebrow">{eyebrow}</div>
        <h1 className="m2-h1">{title}</h1>
        {sub ? <div className="m2-sub">{sub}</div> : null}
      </div>
      {children ? <div className="m2-acts">{children}</div> : null}
    </div>
  );
}
