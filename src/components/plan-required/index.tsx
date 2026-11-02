import Link from 'next/link';

import { ROUTES } from '@/consts/route';

/** 계획이 있어야 하는 화면에서 계획이 없을 때 */
export function PlanRequired({ reason }: { reason: string }) {
  return (
    <p className="text-lg text-muted-foreground">
      먼저{' '}
      <Link href={ROUTES.PLAN} className="font-bold text-brand underline">
        운송계획
      </Link>
      을 생성하세요. {reason}
    </p>
  );
}
