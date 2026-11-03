import { isAxiosError } from 'axios';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { IntakeFieldErrorT } from '@/components/intake-form';
import { PlanLoadError } from '@/components/plan-load-error';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type QueryErrorPropsT = {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
};

export function QueryError({ message, onRetry, isRetrying }: QueryErrorPropsT) {
  return (
    <Card>
      <CardContent>
        <PlanLoadError message={message} onRetry={onRetry} isRetrying={isRetrying} />
      </CardContent>
    </Card>
  );
}

type EmptyStatePropsT = {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children?: ReactNode;
};

export function EmptyState({ title, description, action, children }: EmptyStatePropsT) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
      <p className="text-lg font-bold text-navy">{title}</p>
      {description && <p className="text-muted-foreground">{description}</p>}
      {action && (
        <Link href={action.href} className={buttonVariants({ variant: 'outline' })}>
          {action.label}
        </Link>
      )}
      {children}
    </div>
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
