'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { useMe } from '@/apis/saas/auth';
import { useUpdateCompany } from '@/apis/saas/company';
import { saasErrorReason } from '@/apis/saas/errors';
import { SAAS_ROUTES, roleSettings } from '@/consts/route-saas';
import type { Me } from '@/types/saas';

export function CompanySettings() {
  const { data: me } = useMe();

  if (!me) return null;

  return (
    <div className="m2-profile-settings">
      <div className="m2-head">
        <div>
          <h1 className="m2-h1">업체 설정</h1>
          <p className="m2-sub">현재 업체의 기본 정보를 관리하세요.</p>
        </div>
      </div>
      {me.active_org.role === 'admin' || me.active_org.role === 'owner' ? (
        <CompanyForm key={me.active_org.org_id} me={me} />
      ) : (
        <div className="m2-profile-card">
          <p>업체 관리자만 업체 정보를 변경할 수 있습니다.</p>
          <Link href={roleSettings(me.active_org.org_type)} className="m2-btn m2-btn-sec">
            개인 설정으로 이동
          </Link>
        </div>
      )}
    </div>
  );
}

function CompanyForm({ me }: { me: Me }) {
  const active = me.active_org;
  const [name, setName] = useState(active.org_name);
  const [saved, setSaved] = useState(false);
  const update = useUpdateCompany(active.org_id);
  const trimmed = name.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    if (!trimmed || update.isPending) return;
    update.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName(trimmed);
          setSaved(true);
        },
      }
    );
  };

  return (
    <form className="m2-profile-card" onSubmit={submit}>
      <p className="m2-sub" style={{ marginBottom: 16 }}>
        업체 이름 변경은 같은 업체의 모든 담당자에게 반영됩니다.
      </p>
      <label htmlFor="company-name">업체 이름</label>
      <input
        id="company-name"
        name="company-name"
        autoComplete="organization"
        required
        maxLength={200}
        value={name}
        onChange={event => {
          setName(event.target.value);
          setSaved(false);
          update.reset();
        }}
      />
      <label htmlFor="company-type">업체 종류</label>
      <input id="company-type" value={SAAS_ROUTES[active.org_type].label} readOnly />
      <label htmlFor="company-role">내 권한</label>
      <input id="company-role" value={active.role === 'owner' ? '소유자' : '관리자'} readOnly />
      <div aria-live="polite" role="status">
        {saved ? '업체 정보를 저장했습니다.' : null}
      </div>
      {update.isError ? (
        <p role="alert">
          {saasErrorReason(update.error) ?? '업체 정보를 저장하지 못했습니다. 다시 시도해 주세요.'}
        </p>
      ) : null}
      <button
        type="submit"
        className="m2-btn m2-btn-pri"
        disabled={!trimmed || trimmed === active.org_name || update.isPending}
      >
        {update.isPending ? '저장 중' : '업체 정보 저장'}
      </button>
    </form>
  );
}
