import type { ReactNode } from 'react';

type PageHeaderPropsT = {
  step: string;
  title: string;
  /** 큰 제목. highlight 는 그 뒤에 파란색으로 이어 붙는다 */
  headline: string;
  highlight?: string;
  children?: ReactNode;
};

export function PageHeader({ step, title, headline, highlight, children }: PageHeaderPropsT) {
  return (
    <div className="mb-10 flex items-end gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-navy px-4 py-1 text-lg font-bold num text-white">
            {step}
          </span>
          <span className="text-lg font-bold">{title}</span>
        </div>
        <h1 className="mt-5 text-5xl leading-tight font-black tracking-tight">
          {headline}
          {highlight && <span className="text-brand"> {highlight}</span>}
        </h1>
      </div>
      {children}
    </div>
  );
}
