import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import '@/app/m2.css';
import { MapLinkProvider } from '@/components/map-link';
import {
  LANDING_IDS,
  PALLET_FEE_WON,
  PERFORMANCE_FEE_RATE,
  PROBLEMS,
  SOLUTIONS,
  TEAM_NAME,
  TEAM_SITE_URL,
} from '@/components/saas-landing/content';
import { LandingHero } from '@/components/saas-landing/landing-hero';
import { LandingRoles, LandingRolesSkeleton } from '@/components/saas-landing/landing-roles';
import { SAAS_PAGES } from '@/consts/route-saas';

const SECTION_CLASS = 'flex scroll-mt-6 flex-col gap-4';

function SectionHead({
  id,
  eyebrow,
  title,
  sub,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="m2-eyebrow">{eyebrow}</p>
      <h2 id={id} tabIndex={-1} className="m2-h1 text-[22px] break-keep sm:text-[26px]">
        {title}
      </h2>
      {sub ? <p className="m2-sub break-keep">{sub}</p> : null}
    </div>
  );
}

function ProblemSection() {
  return (
    <section aria-labelledby={`${LANDING_IDS.problem}-title`} className={SECTION_CLASS}>
      <SectionHead
        id={`${LANDING_IDS.problem}-title`}
        eyebrow="문제와 해결"
        title="작은 화주에게 수출 물류는 늘 비싸고, 늘 바뀝니다"
      />
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {PROBLEMS.map(({ key, label, text }) => (
          <li key={key} className="m2-card flex flex-col gap-2 border-l-4 border-l-m2-berry">
            <h3 className="m2-h3 text-[15px] text-m2-berry-ink">{label}</h3>
            <p className="m-0 text-[13.5px] leading-relaxed break-keep text-m2-ink-2">{text}</p>
          </li>
        ))}
      </ul>
      <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        {SOLUTIONS.map(({ key, step, title, text }) => (
          <li key={key} className="m2-card flex flex-col gap-2">
            <span
              aria-hidden
              className="m2-num self-start rounded-full bg-m2-navy px-2.5 py-0.5 text-xs font-bold text-white"
            >
              {step}
            </span>
            <h3 className="m2-h3 text-[15px]">{title}</h3>
            <p className="m-0 text-[13.5px] leading-relaxed break-keep text-m2-ink-2">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RolesSection() {
  return (
    <section
      id={LANDING_IDS.roles}
      aria-labelledby={LANDING_IDS.rolesTitle}
      className={SECTION_CLASS}
    >
      <SectionHead
        id={LANDING_IDS.rolesTitle}
        eyebrow="데모로 둘러보기"
        title="역할을 골라 바로 들어가 보세요"
        sub="비밀번호 없이 예시 조직 계정으로 들어갑니다. 데모 세계의 데이터는 실제 거래가 아닙니다."
      />
      <Suspense fallback={<LandingRolesSkeleton />}>
        <LandingRoles />
      </Suspense>
    </section>
  );
}

function PricingSection() {
  return (
    <section aria-labelledby={`${LANDING_IDS.pricing}-title`} className={SECTION_CLASS}>
      <SectionHead
        id={`${LANDING_IDS.pricing}-title`}
        eyebrow="과금"
        title="아낀 만큼만 받습니다"
      />
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        <li className="m2-card flex flex-col gap-2">
          <h3 className="m2-h3 text-[15px]">성과보수</h3>
          <p className="m2-big m2-num m-0">
            {Math.round(PERFORMANCE_FEE_RATE * 100)}
            <small>%</small>
          </p>
          <p className="m-0 text-[13.5px] leading-relaxed break-keep text-m2-ink-2">
            단독 발송 대비 아낀 금액의 {Math.round(PERFORMANCE_FEE_RATE * 100)}%를 받습니다. 아낀 게
            없으면 0원입니다.
          </p>
        </li>
        <li className="m2-card flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="m2-h3 text-[15px]">포도 파렛트 이용료</h3>
            <span className="m2-chip m2-chip-warn">가정</span>
          </div>
          <p className="m2-big m2-num m-0">
            {PALLET_FEE_WON.toLocaleString('ko-KR')}
            <small>원 / 파렛트</small>
          </p>
          <p className="m-0 text-[13.5px] leading-relaxed break-keep text-m2-ink-2">
            이미 배로 가는 포도는 성과보수 대신 파렛트당 이용료를 받습니다.
          </p>
        </li>
      </ul>
    </section>
  );
}

export function SaasLanding() {
  return (
    <div data-ui="m2" className="m2-page flex flex-col">
      <a
        href={`#${LANDING_IDS.main}`}
        className="sr-only z-20 rounded-lg bg-white px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        본문으로 건너뛰기
      </a>
      <header className="m2-main pb-0">
        <div className="m2-topline mb-0">
          <Link href="/" className="m2-logo">
            프레시스위치
            <span aria-hidden>≈</span>
          </Link>
          <Link href={SAAS_PAGES.LOGIN} className="m2-btn m2-btn-sec m2-btn-sm">
            로그인
          </Link>
        </div>
      </header>
      <main id={LANDING_IDS.main} className="m2-main flex flex-col gap-12 pt-4 pb-12">
        <MapLinkProvider>
          <LandingHero />
        </MapLinkProvider>
        <ProblemSection />
        <RolesSection />
        <PricingSection />
      </main>
      <footer className="m2-main pt-0 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-m2-line pt-5 text-[12.5px] text-m2-muted">
          <span className="font-semibold text-m2-ink-2">{TEAM_NAME}</span>
          <a
            href={TEAM_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-m2-brand-ink"
          >
            freshswitch.ssalhub.xyz
            <span className="sr-only">(새 창)</span>
            <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
          </a>
        </div>
      </footer>
    </div>
  );
}
