'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/consts/route';

/** 화면을 그리다 처리하지 못한 오류가 나면 전체가 깨지는 대신 이 안내를 보여준다 */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h2 className="text-3xl font-bold">화면을 그리다 문제가 생겼습니다</h2>
      <p className="text-lg text-muted-foreground">
        다시 그리기를 누르거나, 출하 입력부터 다시 시작하세요.
      </p>
      <div className="flex gap-3">
        <Button size="lg" onClick={() => retry()}>
          다시 그리기
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href={ROUTES.INTAKE}>출하 입력으로</Link>
        </Button>
      </div>
    </div>
  );
}
