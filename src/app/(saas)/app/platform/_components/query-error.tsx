import { saasErrorDetail, saasErrorStatus } from '@/apis/saas/errors';
import { PlanLoadError } from '@/components/plan-load-error';

type QueryErrorPropsT = {
  error: unknown;
  subject: string;
  onRetry: () => void;
  isRetrying: boolean;
};

const messageOf = (error: unknown, subject: string) => {
  const status = saasErrorStatus(error);
  if (status === 403) return saasErrorDetail(error) ?? `${subject} 볼 권한이 없습니다.`;
  if (status === 404) return `${subject} 찾을 수 없습니다.`;

  return `${subject} 불러오지 못했습니다. 서버 연결을 확인하세요.`;
};

export function QueryError({ error, subject, onRetry, isRetrying }: QueryErrorPropsT) {
  return (
    <PlanLoadError message={messageOf(error, subject)} onRetry={onRetry} isRetrying={isRetrying} />
  );
}
