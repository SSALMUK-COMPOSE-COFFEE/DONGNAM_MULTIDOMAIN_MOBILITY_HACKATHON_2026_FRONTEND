import type { ReactNode } from 'react';

type EmptyStatePropsT = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: EmptyStatePropsT) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-panel px-6 py-14 text-center">
      <p className="text-lg font-bold text-navy">{title}</p>
      {description && <p className="text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
