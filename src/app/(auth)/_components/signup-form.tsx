'use client';

import { useState } from 'react';

import { useSignup } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { FormField } from '@/app/(auth)/_components/form-field';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { SAAS_ROUTES, SIGNUP_ORG_TYPES } from '@/consts/route-saas';

type SignupOrgTypeT = (typeof SIGNUP_ORG_TYPES)[number];

const PASSWORD_MIN_LENGTH = 8;

export function SignupForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    org_name: '',
    org_type: 'shipper' as SignupOrgTypeT,
  });
  const update = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));
  const signup = useSignup();
  const enterApp = useEnterApp();

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        signup.mutate(form, { onSuccess: enterApp });
      }}
    >
      <FormField id="signup-org-type" label="업체 종류">
        <select
          id="signup-org-type"
          className="m2-inp w-full"
          value={form.org_type}
          onChange={event => update({ org_type: event.target.value as SignupOrgTypeT })}
        >
          {SIGNUP_ORG_TYPES.map(orgType => (
            <option key={orgType} value={orgType}>
              {SAAS_ROUTES[orgType].label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="signup-org-name" label="업체 이름">
        <input
          className="m2-inp"
          id="signup-org-name"
          required
          maxLength={200}
          autoComplete="organization"
          value={form.org_name}
          onChange={event => update({ org_name: event.target.value })}
        />
      </FormField>

      <FormField id="signup-name" label="담당자 이름">
        <input
          className="m2-inp"
          id="signup-name"
          required
          maxLength={200}
          autoComplete="name"
          value={form.name}
          onChange={event => update({ name: event.target.value })}
        />
      </FormField>

      <FormField id="signup-email" label="이메일">
        <input
          className="m2-inp"
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={event => update({ email: event.target.value })}
        />
      </FormField>

      <FormField id="signup-password" label="비밀번호" hint={`${PASSWORD_MIN_LENGTH}자 이상`}>
        <input
          className="m2-inp"
          id="signup-password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={128}
          autoComplete="new-password"
          value={form.password}
          onChange={event => update({ password: event.target.value })}
        />
      </FormField>

      {signup.isError && (
        <p role="alert" className="mb-3 text-[12.5px] font-medium text-m2-crit">
          {authErrorMessage(signup.error, '가입하지 못했습니다. 잠시 뒤 다시 시도하세요.')}
        </p>
      )}

      <button
        type="submit"
        className="m2-btn m2-btn-pri m2-btn-lg mt-1 w-full"
        disabled={signup.isPending}
      >
        {signup.isPending ? '가입 중' : '가입하고 시작하기'}
      </button>
    </form>
  );
}
