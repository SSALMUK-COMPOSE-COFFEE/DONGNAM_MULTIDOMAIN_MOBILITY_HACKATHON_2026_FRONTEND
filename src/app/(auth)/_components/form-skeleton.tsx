import { Skeleton } from '@/components/ui/skeleton';

export function FormSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
      <Skeleton className="h-13 w-full" />
    </div>
  );
}
