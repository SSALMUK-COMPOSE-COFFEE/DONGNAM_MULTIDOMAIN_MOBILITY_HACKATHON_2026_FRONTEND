import type { ReactNode } from 'react';

type ForwarderPageHeaderPropsT = {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
};

export function ForwarderPageHeader({ eyebrow, title, sub, children }: ForwarderPageHeaderPropsT) {
  return (
    <div className="m2-head max-[900px]:flex-col max-[900px]:items-start">
      <div className="min-w-0">
        <div className="m2-eyebrow">{eyebrow}</div>
        <h1 className="m2-h1">{title}</h1>
        {sub ? <div className="m2-sub m2-num">{sub}</div> : null}
      </div>
      {children ? <div className="m2-acts">{children}</div> : null}
    </div>
  );
}
