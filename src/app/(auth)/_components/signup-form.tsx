'use client';

import { useState } from 'react';
import { z } from 'zod';

import { useSignup } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { FormField } from '@/app/(auth)/_components/form-field';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SAAS_ROUTES, SIGNUP_ORG_TYPES } from '@/consts/route-saas';

const signupSchema = z.object({
  org_type: z.enum(SIGNUP_ORG_TYPES),
  org_name: z
    .string()
    .trim()
    .min(1, '업체 이름을 입력하세요.')
    .max(200, '200자 이내로 입력하세요.'),
  name: z.string().trim().min(1, '담당자 이름을 입력하세요.').max(200, '200자 이내로 입력하세요.'),
  email: z.string().trim().min(1, '이메일을 입력하세요.').email('이메일 형식을 확인하세요.'),
  password: z
    .string()
    .min(8, '비밀번호를 8자 이상 입력하세요.')
    .max(128, '128자 이내로 입력하세요.'),
});
type SignupFormT = z.infer<typeof signupSchema>;
type FieldErrorsT = Partial<Record<keyof SignupFormT, string>>;

export function SignupForm() {
  const [form, setForm] = useState<SignupFormT>({
    name: '',
    email: '',
    password: '',
    org_name: '',
    org_type: 'shipper',
  });
  const [errors, setErrors] = useState<FieldErrorsT>({});
  const signup = useSignup();
  const enterApp = useEnterApp();
  const update = <K extends keyof SignupFormT>(key: K, value: SignupFormT[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    if (errors[key]) {
      const checked = signupSchema.shape[key].safeParse(value);
      setErrors(previous => ({
        ...previous,
        [key]: checked.success ? null : checked.error.issues[0]?.message,
      }));
    }
    if (signup.isError) signup.reset();
  };
  const errorProps = (key: keyof SignupFormT) => {
    const describedBy = [
      key === 'password' ? 'signup-password-hint' : null,
      errors[key] ? `signup-${key}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      'aria-invalid': !!errors[key],
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    };
  };
  const errorMessage = (key: keyof SignupFormT) =>
    errors[key] ? (
      <p id={`signup-${key}-error`} role="alert" className="fs-signup-error">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form
      className="fs-signup-form"
      noValidate
      onSubmit={event => {
        event.preventDefault();
        const checked = signupSchema.safeParse(form);
        if (!checked.success) {
          const nextErrors: FieldErrorsT = {};
          for (const issue of checked.error.issues) {
            const key = issue.path[0] as keyof SignupFormT;
            if (!nextErrors[key]) nextErrors[key] = issue.message;
          }
          setErrors(nextErrors);
          const element = event.currentTarget;
          requestAnimationFrame(() =>
            element.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
          );
          return;
        }
        setErrors({});
        signup.mutate(checked.data, { onSuccess: enterApp });
      }}
    >
      <fieldset disabled={signup.isPending}>
        <legend>업체 정보</legend>
        <FormField id="signup-org-type" label="업체 종류">
          <Select
            value={form.org_type}
            onValueChange={value => {
              if (value === 'shipper' || value === 'forwarder') update('org_type', value);
            }}
            disabled={signup.isPending}
          >
            <SelectTrigger id="signup-org-type" className="fs-signup-control">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIGNUP_ORG_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {SAAS_ROUTES[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="signup-org-name" label="업체 이름">
          <Input
            id="signup-org-name"
            className="fs-signup-control"
            required
            maxLength={200}
            autoComplete="organization"
            value={form.org_name}
            onChange={event => update('org_name', event.target.value)}
            {...errorProps('org_name')}
          />
          {errorMessage('org_name')}
        </FormField>
      </fieldset>
      <fieldset disabled={signup.isPending}>
        <legend>계정 정보</legend>
        <FormField id="signup-name" label="담당자 이름">
          <Input
            id="signup-name"
            className="fs-signup-control"
            required
            maxLength={200}
            autoComplete="name"
            value={form.name}
            onChange={event => update('name', event.target.value)}
            {...errorProps('name')}
          />
          {errorMessage('name')}
        </FormField>
        <FormField id="signup-email" label="이메일">
          <Input
            id="signup-email"
            className="fs-signup-control"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={event => update('email', event.target.value)}
            {...errorProps('email')}
          />
          {errorMessage('email')}
        </FormField>
        <FormField id="signup-password" label="비밀번호" hint="8자 이상 입력하세요.">
          <PasswordInput
            id="signup-password"
            className="fs-signup-control"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={form.password}
            onChange={event => update('password', event.target.value)}
            {...errorProps('password')}
          />
          {errorMessage('password')}
        </FormField>
      </fieldset>
      {signup.isError && (
        <p role="alert" className="fs-signup-error">
          {authErrorMessage(signup.error, '가입하지 못했습니다. 잠시 뒤 다시 시도하세요.')}
        </p>
      )}
      <Button type="submit" className="fs-signup-submit" disabled={signup.isPending}>
        {signup.isPending ? '가입 중…' : '가입하기'}
      </Button>
    </form>
  );
}
