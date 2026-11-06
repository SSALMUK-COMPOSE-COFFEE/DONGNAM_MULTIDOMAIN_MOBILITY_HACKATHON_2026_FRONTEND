import { isAxiosError } from 'axios';
import { cn } from 'cn';
import Link from 'next/link';

type QueryErrorPropsT = {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
  className?: string;
};

export function QueryError({ message, onRetry, isRetrying, className }: QueryErrorPropsT) {
  return (
    <div
      role="alert"
      className={cn('m2-card flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-[13.5px] font-semibold text-m2-crit">{message}</p>
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
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStatePropsT) {
  return (
    <div
      className={cn(
        'm2-card flex flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className
      )}
    >
      <p className="m2-h2">{title}</p>
      {description && <p className="m2-sub mt-0">{description}</p>}
      {action && (
        <Link href={action.href} className="m2-btn m2-btn-sec mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export const errorStatus = (error: unknown) =>
  isAxiosError(error) ? (error.response?.status ?? null) : null;
