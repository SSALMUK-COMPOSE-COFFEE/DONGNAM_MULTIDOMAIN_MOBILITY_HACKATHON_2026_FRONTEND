'use client';

import { isAxiosError } from 'axios';

import { useLogin } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { FormField } from '@/app/(auth)/_components/form-field';
import { useLoginCredentials } from '@/app/(auth)/_components/login-credentials';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { isDemoEmail } from '@/consts/sandbox-saas';

const DEMO_PASSWORD_LOGIN_MESSAGE =
  "데모 계정은 비밀번호로 로그인할 수 없습니다. 오른쪽 '데모 계정으로 둘러보기'에서 역할을 고르세요.";

const loginErrorMessage = (error: unknown, email: string) => {
  if (isAxiosError(error) && error.response?.status === 401 && isDemoEmail(email))
    return DEMO_PASSWORD_LOGIN_MESSAGE;

  return authErrorMessage(error, '로그인하지 못했습니다. 잠시 뒤 다시 시도하세요.');
};

export function LoginForm() {
  const { email, password, setEmail, setPassword } = useLoginCredentials();
  const login = useLogin();
  const enterApp = useEnterApp();

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        login.mutate({ email, password }, { onSuccess: enterApp });
      }}
    >
      <FormField id="login-email" label="이메일">
        <input
          id="login-email"
          className="m2-inp"
          type="email"
          autoComplete="email"
          placeholder="name@company.kr"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
      </FormField>

      <FormField id="login-password" label="비밀번호">
        <input
          id="login-password"
          className="m2-inp"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
      </FormField>

      {login.isError && (
        <p role="alert" className="mb-3 text-[12.5px] font-medium text-m2-crit">
          {loginErrorMessage(login.error, login.variables?.email ?? email)}
        </p>
      )}

      <button
        type="submit"
        className="m2-btn m2-btn-pri m2-btn-lg mt-1 w-full"
        disabled={login.isPending}
      >
        {login.isPending ? '로그인 중' : '로그인'}
      </button>
    </form>
  );
}
