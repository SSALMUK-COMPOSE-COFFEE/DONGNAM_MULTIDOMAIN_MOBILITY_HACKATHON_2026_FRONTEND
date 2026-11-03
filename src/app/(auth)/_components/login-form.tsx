'use client';

import { isAxiosError } from 'axios';
import { useState } from 'react';

import { useLogin } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { FormField } from '@/app/(auth)/_components/form-field';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isDemoEmail } from '@/consts/sandbox-saas';

const DEMO_PASSWORD_LOGIN_MESSAGE =
  "데모 계정은 비밀번호로 로그인할 수 없습니다. 오른쪽 '데모 계정으로 둘러보기'에서 역할을 고르세요.";

const loginErrorMessage = (error: unknown, email: string) => {
  if (isAxiosError(error) && error.response?.status === 401 && isDemoEmail(email))
    return DEMO_PASSWORD_LOGIN_MESSAGE;

  return authErrorMessage(error, '로그인하지 못했습니다. 잠시 뒤 다시 시도하세요.');
};

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const enterApp = useEnterApp();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={event => {
        event.preventDefault();
        login.mutate({ email, password }, { onSuccess: enterApp });
      }}
    >
      <FormField id="login-email" label="이메일">
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
      </FormField>

      <FormField id="login-password" label="비밀번호">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
      </FormField>

      {login.isError && (
        <p role="alert" className="text-sm text-berry">
          {loginErrorMessage(login.error, login.variables?.email ?? email)}
        </p>
      )}

      <Button type="submit" size="lg" disabled={login.isPending}>
        {login.isPending ? '로그인 중' : '로그인'}
      </Button>
    </form>
  );
}
