import type { ReactNode } from 'react';

type EmptyStatePropsT = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
};

export function EmptyState({ title, description, children, compact = false }: EmptyStatePropsT) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center gap-2 rounded-[14px] bg-[rgba(15,27,51,0.035)] px-5 py-7 text-center'
          : 'flex flex-col items-center gap-3 rounded-[14px] bg-[rgba(15,27,51,0.035)] px-6 py-12 text-center'
      }
    >
      <p className="m2-h2">{title}</p>
      {description ? <p className="m2-sub mt-0">{description}</p> : null}
      {children}
    </div>
  );
}
