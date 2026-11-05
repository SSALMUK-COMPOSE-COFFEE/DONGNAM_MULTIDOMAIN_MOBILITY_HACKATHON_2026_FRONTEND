'use client';

import { useState } from 'react';

import { useLogin } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { FormField } from '@/app/(auth)/_components/form-field';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { PasswordInput } from '@/components/ui/password-input';

const ACCOUNT_PASSWORD = 'FreshSwitch2026!';
const ACCOUNTS = [
  { role: '화주', email: 'shipper@example.com' },
  { role: '서비스 관리자', email: 'platform@example.com' },
  { role: '포워더', email: 'forwarder@example.com' },
] as const;

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const enterApp = useEnterApp();
  const selected = ACCOUNTS.find(
    account => account.email === email && password === ACCOUNT_PASSWORD
  );

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
        <PasswordInput
          id="login-password"
          className="m2-inp"
          autoComplete="current-password"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
      </FormField>

      {login.isError && (
        <p role="alert" className="mb-3 text-[12.5px] font-medium text-m2-crit">
          {authErrorMessage(login.error, '로그인하지 못했습니다. 잠시 뒤 다시 시도하세요.')}
        </p>
      )}

      <button
        type="submit"
        className="m2-btn m2-btn-pri m2-btn-lg mt-1 w-full"
        disabled={login.isPending}
      >
        {login.isPending ? '로그인 중' : '로그인'}
      </button>
      <div className="fs-login-account-section">
        <div role="group" aria-label="계정 선택" className="fs-login-accounts">
          {ACCOUNTS.map(account => (
            <button
              key={account.email}
              type="button"
              aria-pressed={selected?.email === account.email}
              onClick={() => {
                setEmail(account.email);
                setPassword(ACCOUNT_PASSWORD);
              }}
              className="fs-login-account"
            >
              <span className="fs-login-account-role">{account.role}</span>
              <span className="fs-login-account-email">{account.email}</span>
            </button>
          ))}
        </div>
        <p className="fs-login-shared-password">
          공통 비밀번호 <code>{ACCOUNT_PASSWORD}</code>
        </p>
        <p role="status" className="sr-only">
          {selected ? `${selected.role} 계정 입력됨 · 로그인 버튼을 눌러주세요.` : ''}
        </p>
      </div>
    </form>
  );
}
