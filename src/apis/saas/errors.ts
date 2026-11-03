import { isAxiosError } from 'axios';
import { toast } from 'sonner';

const VALUE_ERROR_PREFIX = 'Value error, ';

const validationMessages = (detail: unknown[]) =>
  detail
    .map(item => (item as { msg?: unknown } | null)?.msg)
    .filter((msg): msg is string => typeof msg === 'string' && msg.length > 0)
    .map(msg => (msg.startsWith(VALUE_ERROR_PREFIX) ? msg.slice(VALUE_ERROR_PREFIX.length) : msg));

export const saasErrorStatus = (error: unknown) =>
  isAxiosError(error) ? (error.response?.status ?? null) : null;

export const saasErrorDetail = (error: unknown): string | null => {
  if (!isAxiosError(error)) return null;

  const detail: unknown = (error.response?.data as { detail?: unknown } | undefined)?.detail;

  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) return validationMessages(detail).join(' · ') || null;

  return null;
};

export const saasErrorReason = (error: unknown): string | null => {
  const detail = saasErrorDetail(error);
  if (detail) return detail;

  const status = saasErrorStatus(error);
  if (status === 403) return '이 조직 권한으로는 할 수 없는 작업입니다.';
  if (status === 422) return '요청 값을 서버가 받아들이지 않았습니다.';
  if (isAxiosError(error) && !error.response) return '서버에 연결하지 못했습니다.';

  return null;
};

export const toastSaasError = (title: string) => (error: unknown) =>
  toast.error(title, { description: saasErrorReason(error) });
