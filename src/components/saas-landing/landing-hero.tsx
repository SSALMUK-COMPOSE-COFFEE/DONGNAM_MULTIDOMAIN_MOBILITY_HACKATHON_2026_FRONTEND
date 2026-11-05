'use client';

import Link from 'next/link';

import { useMe } from '@/apis/saas/auth';
import { PalletBar, type PalletSegmentT } from '@/components/pallet-bar';
import { SAAS_PAGES, roleHome } from '@/consts/route-saas';

const LOADS: { title: string; capacity: number; segments: PalletSegmentT[] }[] = [
  {
    title: '딸기 · 홍콩 CA-01',
    capacity: 20,
    segments: [
      { key: 'jinju', label: '진주', pallets: 8, colorClassName: 'bg-navy' },
      { key: 'sancheong', label: '산청', pallets: 5, colorClassName: 'bg-brand' },
      { key: 'miryang', label: '밀양', pallets: 4, colorClassName: 'bg-cyan' },
    ],
  },
  {
    title: '포도 · 가오슝 CA-02',
    capacity: 20,
    segments: [
      { key: 'sangju', label: '상주', pallets: 13, colorClassName: 'bg-grape' },
      { key: 'pohang', label: '포항', pallets: 5, colorClassName: 'bg-grape-soft' },
    ],
  },
];

export function LandingHero() {
  const session = useMe().data;

  return (
    <section className="fs-public-hero" aria-labelledby="landing-title">
      <div className="fs-public-intro">
        <p className="fs-public-kicker">신선 농산물 수출 공동적재</p>
        <h1 id="landing-title">
          작은 출하도,
          <br />
          함께 채우는
          <br />
          <span>수출 컨테이너</span>
        </h1>
        <p className="fs-public-lead">
          혼자 채우기 어려웠던 컨테이너, 함께 실으면 되니까.
          <br className="fs-public-desktop-break" /> 출하 등록부터 공동적재 계획까지 한곳에서.
        </p>
        <div className="fs-public-actions">
          <Link
            href={
              session && !session.world ? roleHome(session.active_org.org_type) : SAAS_PAGES.LOGIN
            }
            className="fs-public-primary"
          >
            {session && !session.world ? '내 업무 화면으로' : '로그인'}
            <span aria-hidden>↗</span>
          </Link>
          <a href="/intake" className="fs-public-secondary">
            시연 화면 보기
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
      <div className="fs-public-pooling" aria-labelledby="pooling-title">
        <h2 id="pooling-title">
          각자의 화물이
          <br />
          하나의 컨테이너로.
        </h2>
        <div className="fs-public-pooling-bars">
          {LOADS.map(load => (
            <PalletBar key={load.title} description="예시" {...load} />
          ))}
        </div>
        <div className="fs-public-pooling-bottom">
          <span>컨테이너 배정</span>
          <span>집하 경로</span>
          <span>운송 현황</span>
        </div>
      </div>
    </section>
  );
}
