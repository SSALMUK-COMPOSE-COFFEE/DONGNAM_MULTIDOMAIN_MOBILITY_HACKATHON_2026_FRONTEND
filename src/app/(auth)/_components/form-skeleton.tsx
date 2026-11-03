import { Skeleton } from '@/components/ui/skeleton';

export function FormSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-xl" />
      ))}
      <Skeleton className="mt-1 h-12 w-full rounded-[14px]" />
    </div>
  );
}

export function RoleSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-[68px] w-full rounded-[14px]" />
      ))}
    </div>
  );
}
