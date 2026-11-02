import { Button } from '@/components/ui/button';

type PlanLoadErrorPropsT = {
  message?: string;
  onRetry: () => void;
  isRetrying: boolean;
};

/** 계획 조회가 네트워크·타임아웃으로 실패했을 때 보여준다 (404 는 useCurrentPlan 이 처리한다) */
export function PlanLoadError({
  message = '운송계획을 불러오지 못했습니다. 서버 연결을 확인하세요.',
  onRetry,
  isRetrying,
}: PlanLoadErrorPropsT) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? '다시 시도 중' : '다시 시도'}
      </Button>
    </div>
  );
}
