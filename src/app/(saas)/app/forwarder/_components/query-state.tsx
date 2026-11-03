import { isAxiosError } from 'axios';
import Link from 'next/link';

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
};

export function EmptyState({ title, description, action }: EmptyStatePropsT) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
      <p className="text-lg font-bold text-navy">{title}</p>
      {description && <p className="text-muted-foreground">{description}</p>}
      {action && (
        <Link href={action.href} className={buttonVariants({ variant: 'outline' })}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export const errorStatus = (error: unknown) =>
  isAxiosError(error) ? (error.response?.status ?? null) : null;
