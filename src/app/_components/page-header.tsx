import type { ReactNode } from 'react';

type PageHeaderPropsT = {
  step: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ step, title, description, children }: PageHeaderPropsT) {
  return (
    <div className="mb-8 flex items-end gap-5">
      <span className="num text-5xl leading-none font-semibold text-sea">{step}</span>
      <div className="flex-1">
        <h1 className="font-heading text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
