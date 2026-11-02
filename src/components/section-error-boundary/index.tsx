'use client';

import { cn } from 'cn';
import { type ErrorInfo, catchError } from 'next/error';

import { Button } from '@/components/ui/button';

type SectionErrorFallbackPropsT = {
  message: string;
  className?: string;
};

function SectionErrorFallback(
  { message, className }: SectionErrorFallbackPropsT,
  { retry }: ErrorInfo
) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted text-muted-foreground',
        className
      )}
    >
      <p>{message}</p>
      <Button variant="outline" onClick={() => retry()}>
        다시 그리기
      </Button>
    </div>
  );
}

/** 화면 일부(지도 등)에서 오류가 나도 그 영역만 안내로 바꾸고 나머지 화면은 살린다 */
export const SectionErrorBoundary = catchError(SectionErrorFallback);
