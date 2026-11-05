'use client';

import { isAxiosError } from 'axios';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { useDemoLogin, useMe } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import {
  DEMO_ACCOUNT_PASSWORD,
  DEMO_ROLE_ACCOUNTS,
  useLoginCredentials,
} from '@/app/(auth)/_components/login-credentials';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { roleHome } from '@/consts/route-saas';

export function DemoLoginPanel() {
  const demoLogin = useDemoLogin();
  const enterApp = useEnterApp();
  const me = useMe();
  const session = me.data ?? null;
  const anonymous = isAxiosError(me.error) && me.error.response?.status === 401;

  const enter = () => {
    demoLogin.mutate({ new_world: true }, { onSuccess: enterApp });
  };

  if (!session && me.isPending) {
    return <p className="m2-sub mt-0">계정 확인 중</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {session ? (
        <p className="m2-sub mt-0">{session.active_org.org_name} 계정으로 들어갔습니다.</p>
      ) : null}
      {session && !session.world ? (
        <Link href={roleHome(session.active_org.org_type)} className="m2-btn m2-btn-pri self-start">
          내 화면으로
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
        </Link>
      ) : (
        <button
          type="button"
          className="m2-btn m2-btn-pri self-start disabled:cursor-wait"
          disabled={demoLogin.isPending}
          aria-busy={demoLogin.isPending}
          onClick={enter}
        >
          {demoLogin.isPending ? '들어가는 중' : '데모로 둘러보기'}
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
        </button>
      )}
      <DemoAccountCards />
      {session?.world ? (
        <Link href={roleHome(session.active_org.org_type)} className="m2-btn m2-btn-sec self-start">
          내 화면으로
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
        </Link>
      ) : null}
      {demoLogin.isError && (
        <p role="alert" className="text-[12.5px] font-medium text-m2-crit">
          {authErrorMessage(demoLogin.error, '데모 계정으로 들어가지 못했습니다.')}
        </p>
      )}
      {me.isError && !anonymous && (
        <p role="alert" className="text-[12.5px] font-medium text-m2-crit">
          {authErrorMessage(me.error, '계정 정보를 확인하지 못했습니다.')}
        </p>
      )}
    </div>
  );
}

function DemoAccountCards() {
  const { email, password, setEmail, setPassword } = useLoginCredentials();
  const selected = DEMO_ROLE_ACCOUNTS.find(
    account => account.email === email && password === DEMO_ACCOUNT_PASSWORD
  );

  return (
    <div className="fs-login-account-section">
      <div role="group" aria-label="체험 계정 선택" className="fs-login-accounts">
        {DEMO_ROLE_ACCOUNTS.map(account => (
          <button
            key={account.email}
            type="button"
            aria-pressed={selected?.email === account.email}
            onClick={() => {
              setEmail(account.email);
              setPassword(DEMO_ACCOUNT_PASSWORD);
            }}
            className="fs-login-account"
          >
            <span className="fs-login-account-role">{account.role}</span>
            <span className="fs-login-account-email">{account.email}</span>
          </button>
        ))}
      </div>
      <p className="fs-login-shared-password">
        공통 비밀번호 <code>{DEMO_ACCOUNT_PASSWORD}</code>
      </p>
      <p role="status" className="sr-only">
        {selected ? `${selected.role} 계정 입력됨 · 로그인 버튼을 눌러주세요.` : ''}
      </p>
    </div>
  );
}
