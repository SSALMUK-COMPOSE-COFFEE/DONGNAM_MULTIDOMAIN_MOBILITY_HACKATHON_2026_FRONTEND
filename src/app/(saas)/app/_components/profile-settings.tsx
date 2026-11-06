'use client';

import { type FormEvent, useState } from 'react';

import { useMe, useUpdateProfile } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import type { Me } from '@/types/saas';

export function ProfileSettings() {
  const { data: me } = useMe();

  return me ? <ProfileForm key={me.user.id} me={me} /> : null;
}

function ProfileForm({ me }: { me: Me }) {
  const [name, setName] = useState(me.user.name);
  const update = useUpdateProfile();
  const [saved, setSaved] = useState(false);
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
    <div className="m2-profile-settings">
      <div className="m2-head">
        <div>
          <h1 className="m2-h1">개인 설정</h1>
          <p className="m2-sub">내 이름과 로그인 이메일을 확인하세요.</p>
        </div>
      </div>
      <form className="m2-profile-card" onSubmit={submit}>
        <label htmlFor="profile-name">이름</label>
        <input
          id="profile-name"
          disabled={update.isPending}
          name="name"
          autoComplete="name"
          required
          maxLength={200}
          value={name}
          onChange={event => {
            setName(event.target.value);
            setSaved(false);
            if (update.isError && !update.isPending) update.reset();
          }}
        />
        <label htmlFor="profile-email">이메일</label>
        <input
          id="profile-email"
          name="email"
          type="email"
          autoComplete="email"
          value={me.user.email}
          readOnly
          aria-describedby="profile-email-note"
        />
        <p id="profile-email-note" className="m2-sub">
          로그인 이메일은 변경할 수 없습니다.
        </p>
        <div aria-live="polite" role="status">
          {saved ? '개인 설정을 저장했습니다.' : null}
        </div>
        {update.isError ? (
          <p role="alert">
            {authErrorMessage(update.error, '개인 설정을 저장하지 못했습니다. 다시 시도해 주세요.')}
          </p>
        ) : null}
        <button
          type="submit"
          className="m2-btn m2-btn-pri"
          disabled={!trimmed || trimmed === me.user.name || update.isPending}
        >
          {update.isPending ? '저장 중' : '변경사항 저장'}
        </button>
      </form>
    </div>
  );
}
