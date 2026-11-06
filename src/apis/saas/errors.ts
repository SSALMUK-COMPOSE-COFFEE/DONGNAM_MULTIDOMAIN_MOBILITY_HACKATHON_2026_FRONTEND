import { isAxiosError } from 'axios';
import { toast } from 'sonner';

const VALUE_ERROR_PREFIX = 'Value error, ';

const displayPlaceTerm = (message: string) =>
  message
    .replaceAll('선과장으로', '출하 장소로')
    .replaceAll('선과장을', '출하 장소를')
    .replaceAll('선과장이', '출하 장소가')
    .replaceAll('선과장은', '출하 장소는')
    .replaceAll('선과장', '출하 장소');

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

  if (typeof detail === 'string' && detail) return displayPlaceTerm(detail);
  if (Array.isArray(detail))
    return displayPlaceTerm(validationMessages(detail).join(' · ')) || null;

  return null;
};

export const saasErrorReason = (error: unknown): string | null => {
  const detail = saasErrorDetail(error);
  if (detail) return detail;

  const status = saasErrorStatus(error);
  if (status === 403) return '이 업체 권한으로는 할 수 없는 작업입니다.';
  if (status === 422) return '요청 값을 서버가 받아들이지 않았습니다.';
  if (status === 429) return '요청이 너무 잦습니다. 잠시 뒤 다시 시도하세요.';
  if (isAxiosError(error) && !error.response) return '서버에 연결하지 못했습니다.';

  return null;
};

export const toastSaasError = (title: string) => (error: unknown) =>
  toast.error(title, { description: saasErrorReason(error) });
