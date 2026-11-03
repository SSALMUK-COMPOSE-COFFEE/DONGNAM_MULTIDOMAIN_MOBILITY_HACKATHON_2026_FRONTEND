import type { ReactNode } from 'react';

type PlatformHeaderPropsT = {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
};

export function PlatformHeader({ eyebrow, title, sub, children }: PlatformHeaderPropsT) {
  return (
    <div className="m2-head max-[900px]:flex-col max-[900px]:items-start">
      <div className="min-w-0">
        <div className="m2-eyebrow">{eyebrow}</div>
        <h1 className="m2-h1">{title}</h1>
        {sub ? <div className="m2-sub m2-num">{sub}</div> : null}
      </div>
      {children ? <div className="m2-acts flex-wrap">{children}</div> : null}
    </div>
  );
}
