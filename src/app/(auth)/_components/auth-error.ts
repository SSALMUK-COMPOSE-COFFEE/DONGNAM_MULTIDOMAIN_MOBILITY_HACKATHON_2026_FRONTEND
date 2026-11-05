import { isAxiosError } from 'axios';

const fieldLabels: Record<string, string> = {
  name: '이름',
  email: '이메일',
  password: '비밀번호',
  org_name: '업체 이름',
  org_type: '업체 유형',
};

const validationMessage = (issue: unknown): string | null => {
  if (!issue || typeof issue !== 'object' || !('loc' in issue) || !Array.isArray(issue.loc))
    return null;
  const field = issue.loc.at(-1);
  const label = typeof field === 'string' ? fieldLabels[field] : null;
  if (!label) return null;
  const type = 'type' in issue ? issue.type : null;
  const ctx = 'ctx' in issue && issue.ctx && typeof issue.ctx === 'object' ? issue.ctx : null;
  if (type === 'missing') return `${label} 항목을 입력하세요.`;
  if (
    type === 'string_too_short' &&
    ctx &&
    'min_length' in ctx &&
    typeof ctx.min_length === 'number'
  )
    return `${label} 항목은 ${ctx.min_length}자 이상 입력하세요.`;
  if (
    type === 'string_too_long' &&
    ctx &&
    'max_length' in ctx &&
    typeof ctx.max_length === 'number'
  )
    return `${label} 항목은 ${ctx.max_length}자 이하로 입력하세요.`;
  if (field === 'email') return '이메일 주소를 확인하세요. 예: name@example.com';
  if (field === 'org_type') return '업체 유형을 선택하세요.';
  return `${label} 항목의 입력 내용을 확인하세요.`;
};

export const authErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도하세요.';

  const detail: unknown = error.response.data?.detail;

  if (typeof detail === 'string') return detail;
  if (error.response.status === 422) {
    const messages = Array.isArray(detail) ? detail.map(validationMessage).filter(Boolean) : [];
    return messages.length > 0
      ? [...new Set(messages)].join(' ')
      : '요청을 처리하지 못했습니다. 새로고침한 뒤 다시 시도하세요.';
  }

  return fallback;
};
