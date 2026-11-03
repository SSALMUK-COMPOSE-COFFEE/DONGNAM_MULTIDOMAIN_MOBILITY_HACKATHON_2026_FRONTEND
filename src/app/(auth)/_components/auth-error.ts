import { isAxiosError } from 'axios';

export const authErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도하세요.';

  const detail: unknown = error.response.data?.detail;

  if (typeof detail === 'string') return detail;
  if (error.response.status === 422) return '입력한 값을 다시 확인하세요.';

  return fallback;
};
