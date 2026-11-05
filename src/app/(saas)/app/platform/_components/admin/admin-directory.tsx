'use client';

import Link from 'next/link';
import { useState } from 'react';

import { type AdminCompanyT, type AdminUserT, useAdminOverview } from '@/apis/saas/admin';
import { ADMIN_PATHS } from '@/app/(saas)/app/platform/_components/admin/admin-paths';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';

const COMPANY_TYPES: Record<string, string> = {
  platform: '서비스 관리자',
  shipper: '화주',
  forwarder: '포워더',
  demo: '데모',
};
const MEMBER_ROLES: Record<string, string> = { owner: '소유자', admin: '관리자', member: '담당자' };

export function AdminOverviewView() {
  const query = useAdminOverview();
  const data = query.data;

  return (
    <>
      <PlatformHeader
        eyebrow="서비스 관리"
        title="서비스 현황"
        sub="등록 업체와 계정, 출하와 운송계획 현황을 확인하세요."
      />
      {query.isPending ? <Skeleton className="h-48 rounded-2xl" /> : null}
      {query.isError ? (
        <QueryError
          subject="서비스 현황을"
          error={query.error}
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}
      {data ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 min-[1180px]:grid-cols-4">
            {[
              {
                label: '등록 업체',
                value: data.counts.companies,
                unit: '곳',
                href: ADMIN_PATHS.COMPANIES,
              },
              { label: '등록 계정', value: data.counts.users, unit: '명', href: ADMIN_PATHS.USERS },
              { label: '출하', value: data.counts.shipments, unit: '건', href: null },
              { label: '운송계획', value: data.counts.plans, unit: '개', href: ADMIN_PATHS.PLANS },
            ].map(metric => (
              <section className="m2-card" key={metric.label} aria-label={metric.label}>
                <p className="m2-sub mt-0">{metric.label}</p>
                <p className="m2-num my-3 text-3xl font-bold">
                  {metric.value.toLocaleString('ko-KR')}
                  <span className="ml-1 text-sm font-normal text-m2-muted">{metric.unit}</span>
                </p>
                {metric.href ? (
                  <Link href={metric.href} className="text-sm text-m2-brand">
                    목록 보기 →
                  </Link>
                ) : null}
              </section>
            ))}
          </div>
          <section className="m2-card mb-5">
            <div className="m2-card-h">
              <h2 className="m2-h2">등록 업체</h2>
              <Link href={ADMIN_PATHS.COMPANIES} className="m2-btn m2-btn-sec m2-btn-sm">
                전체 보기
              </Link>
            </div>
            <CompanyTable companies={data.companies.slice(0, 5)} />
          </section>
          <section className="m2-card">
            <div className="m2-card-h">
              <h2 className="m2-h2">등록 계정</h2>
              <Link href={ADMIN_PATHS.USERS} className="m2-btn m2-btn-sec m2-btn-sm">
                전체 보기
              </Link>
            </div>
            <UserTable users={data.users.slice(0, 5)} />
          </section>
        </>
      ) : null}
    </>
  );
}

export function AdminDirectoryView({ kind }: { kind: 'companies' | 'users' }) {
  const query = useAdminOverview();
  const [search, setSearch] = useState('');
  const term = search.trim().toLocaleLowerCase();
  const companies = (query.data?.companies ?? []).filter(company =>
    `${company.name} ${COMPANY_TYPES[company.type] ?? company.type}`
      .toLocaleLowerCase()
      .includes(term)
  );
  const users = (query.data?.users ?? []).filter(user =>
    `${user.name} ${user.email} ${user.memberships.map(item => item.org_name).join(' ')}`
      .toLocaleLowerCase()
      .includes(term)
  );
  const title = kind === 'companies' ? '업체 현황' : '계정 현황';

  return (
    <>
      <PlatformHeader
        eyebrow="서비스 관리"
        title={title}
        sub={
          kind === 'companies'
            ? '등록 업체의 유형과 소속 계정 수를 확인합니다.'
            : '등록 계정의 이메일과 업체별 권한을 확인합니다.'
        }
      />
      <section className="m2-card">
        <div className="m2-card-h flex-wrap gap-3">
          <h2 className="m2-h2">
            {title}
            {query.data ? (
              <span className="ml-2 text-sm font-normal text-m2-muted">
                {(kind === 'companies'
                  ? query.data.counts.companies
                  : query.data.counts.users
                ).toLocaleString('ko-KR')}
                {kind === 'companies' ? '곳' : '명'}
              </span>
            ) : null}
          </h2>
          <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="sr-only">{kind === 'companies' ? '업체 검색' : '계정 검색'}</span>
            <input
              className="m2-inp w-full max-w-72"
              type="search"
              placeholder={kind === 'companies' ? '업체 이름·유형 검색' : '이름·이메일·업체 검색'}
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </label>
        </div>
        {query.isPending ? <Skeleton className="h-64 rounded-xl" /> : null}
        {query.isError ? (
          <QueryError
            subject="목록을"
            error={query.error}
            onRetry={() => query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : null}
        {query.data && kind === 'companies' ? <CompanyTable companies={companies} /> : null}
        {query.data && kind === 'users' ? <UserTable users={users} /> : null}
      </section>
    </>
  );
}

function CompanyTable({ companies }: { companies: AdminCompanyT[] }) {
  if (!companies.length) return <EmptyState compact title="표시할 업체가 없습니다" />;

  return (
    <div className="overflow-x-auto">
      <table className="m2-table">
        <thead>
          <tr>
            <th>업체 이름</th>
            <th>유형</th>
            <th className="r">소속 계정</th>
            <th>환경</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(company => (
            <tr key={company.id}>
              <td className="font-semibold whitespace-normal">{company.name}</td>
              <td>{COMPANY_TYPES[company.type] ?? company.type}</td>
              <td className="r m2-num">{company.members_count}명</td>
              <td>
                <span className="m2-chip">{company.sandbox ? '데모' : '서비스'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({ users }: { users: AdminUserT[] }) {
  if (!users.length) return <EmptyState compact title="표시할 계정이 없습니다" />;

  return (
    <>
      <div className="grid gap-3 min-[768px]:hidden">
        {users.map(user => (
          <article
            key={user.id}
            aria-label={user.name}
            className="rounded-xl border border-m2-line p-4"
          >
            <h3 className="text-sm font-semibold">{user.name}</h3>
            <p className="mt-1 text-sm break-all text-m2-muted">{user.email}</p>
            <dl className="mt-4 grid gap-2">
              {user.memberships.map(membership => (
                <div
                  key={membership.org_id}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <dt className="min-w-0 break-words">{membership.org_name}</dt>
                  <dd className="shrink-0 text-m2-muted">
                    {MEMBER_ROLES[membership.role] ?? membership.role}
                  </dd>
                </div>
              ))}
            </dl>
            {!user.memberships.length ? <p className="m2-sub">소속 업체 없음</p> : null}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto min-[768px]:block">
        <table className="m2-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>소속 업체 · 권한</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="font-semibold">{user.name}</td>
                <td className="break-all whitespace-normal">{user.email}</td>
                <td className="min-w-48 whitespace-normal">
                  {user.memberships.length
                    ? user.memberships.map(membership => (
                        <div key={membership.org_id}>
                          {membership.org_name}
                          <span className="ml-2 text-xs text-m2-muted">
                            {MEMBER_ROLES[membership.role] ?? membership.role}
                          </span>
                        </div>
                      ))
                    : '소속 업체 없음'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
