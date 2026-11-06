import { isAxiosError } from 'axios';
import { cn } from 'cn';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { IntakeFieldErrorT } from '@/components/intake-form/types';

type QueryErrorPropsT = {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
  className?: string;
};

export function QueryError({ message, onRetry, isRetrying, className }: QueryErrorPropsT) {
  return (
    <div role="alert" className={cn('m2-card flex items-center gap-3', className)}>
      <p className="flex-1 text-[13.5px] text-m2-crit">{message}</p>
      <button
        type="button"
        className="m2-btn m2-btn-sec m2-btn-sm"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? '다시 시도 중' : '다시 시도'}
      </button>
    </div>
  );
}

type EmptyStatePropsT = {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, children, className }: EmptyStatePropsT) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-[14px] bg-white/70 px-6 py-10 text-center shadow-[0_0_0_1px_var(--m2-line-2)]',
        className
      )}
    >
      <p className="m2-h2">{title}</p>
      {description && <p className="m2-sub mt-0 max-w-[460px]">{description}</p>}
      {action && (
        <Link href={action.href} className="m2-btn m2-btn-sec mt-2">
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}

export function CardSkeleton({ height, className }: { height: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('m2-card animate-pulse motion-reduce:animate-none', className)}
      style={{ height }}
    />
  );
}

export const errorStatus = (error: unknown) =>
  isAxiosError(error) ? (error.response?.status ?? null) : null;

export const errorDetail = (error: unknown, fallback: string) => {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;

  return typeof detail === 'string' && detail ? detail : fallback;
};

export const toFieldErrors = (error: unknown): IntakeFieldErrorT[] => {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;

  return Array.isArray(detail)
    ? detail.filter(
        (item): item is IntakeFieldErrorT =>
          typeof item?.field === 'string' && typeof item?.message === 'string'
      )
    : [];
};
