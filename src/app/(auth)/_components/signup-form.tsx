'use client';

import { useState } from 'react';

import { useSignup } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { FormField } from '@/app/(auth)/_components/form-field';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      className="flex flex-col gap-5"
      onSubmit={event => {
        event.preventDefault();
        signup.mutate(form, { onSuccess: enterApp });
      }}
    >
      <FormField id="signup-org-type" label="회사 종류">
        <Select
          value={form.org_type}
          onValueChange={value => update({ org_type: value as SignupOrgTypeT })}
        >
          <SelectTrigger id="signup-org-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIGNUP_ORG_TYPES.map(orgType => (
              <SelectItem key={orgType} value={orgType}>
                {SAAS_ROUTES[orgType].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField id="signup-org-name" label="회사 이름">
        <Input
          id="signup-org-name"
          required
          maxLength={200}
          autoComplete="organization"
          value={form.org_name}
          onChange={event => update({ org_name: event.target.value })}
        />
      </FormField>

      <FormField id="signup-name" label="담당자 이름">
        <Input
          id="signup-name"
          required
          maxLength={200}
          autoComplete="name"
          value={form.name}
          onChange={event => update({ name: event.target.value })}
        />
      </FormField>

      <FormField id="signup-email" label="이메일">
        <Input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={event => update({ email: event.target.value })}
        />
      </FormField>

      <FormField id="signup-password" label="비밀번호" hint={`${PASSWORD_MIN_LENGTH}자 이상`}>
        <Input
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
        <p role="alert" className="text-sm text-berry">
          {authErrorMessage(signup.error, '가입하지 못했습니다. 잠시 뒤 다시 시도하세요.')}
        </p>
      )}

      <Button type="submit" size="lg" disabled={signup.isPending}>
        {signup.isPending ? '가입 중' : '가입하고 시작하기'}
      </Button>
    </form>
  );
}
