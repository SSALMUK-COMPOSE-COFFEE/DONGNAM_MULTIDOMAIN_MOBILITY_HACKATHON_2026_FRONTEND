'use client';

import { type ReactNode, createContext, useContext, useState } from 'react';

export const DEMO_ACCOUNT_PASSWORD = 'FreshSwitch2026!';

export const DEMO_ROLE_ACCOUNTS = [
  { role: '화주', email: 'shipper@example.com' },
  { role: '서비스 관리자', email: 'platform@example.com' },
  { role: '포워더', email: 'forwarder@example.com' },
] as const;

type LoginCredentials = {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
};

const LoginCredentialsContext = createContext<LoginCredentials | null>(null);

export function LoginCredentialsProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <LoginCredentialsContext.Provider value={{ email, password, setEmail, setPassword }}>
      {children}
    </LoginCredentialsContext.Provider>
  );
}

export function useLoginCredentials() {
  const credentials = useContext(LoginCredentialsContext);
  if (!credentials) throw new Error('로그인 정보 제공자가 필요합니다.');

  return credentials;
}
