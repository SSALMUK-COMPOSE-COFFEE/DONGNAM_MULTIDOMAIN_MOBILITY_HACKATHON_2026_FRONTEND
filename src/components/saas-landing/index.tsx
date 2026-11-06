import Link from 'next/link';

import '@/app/m2.css';
import { LandingHero } from '@/components/saas-landing/landing-hero';
import '@/components/saas-landing/landing.css';
import { SAAS_PAGES } from '@/consts/route-saas';

const STEPS = [
  {
    number: '01',
    title: '출하 등록',
    text: '무엇을, 얼마나, 어디서 보낼지. 품목과 수량, 출하 가능한 날짜를 등록하세요.',
  },
  {
    number: '02',
    title: '공동적재 계획',
    text: '출하 조건에 맞는 항차와 컨테이너를 연결하고, 함께 실을 화물과 집하 경로를 검토하세요.',
  },
  {
    number: '03',
    title: '계획 확인과 운송',
    text: '화주는 배정안을 확인하고, 포워더는 예약과 집하를 준비해요. 일정이 바뀌면 대안을 비교해 조정할 수 있어요.',
  },
];

export function SaasLanding() {
  return (
    <div data-ui="m2" className="fs-public">
      <a href="#landing-main" className="fs-public-skip">
        본문으로 건너뛰기
      </a>
      <header className="fs-public-header fs-public-width">
        <Link href="/" className="fs-public-logo" aria-label="프레시스위치 홈">
          프레시스위치 <span aria-hidden>≈</span>
        </Link>
        <nav aria-label="공개 메뉴">
          <Link href={SAAS_PAGES.LOGIN} className="fs-public-header-login">
            로그인
          </Link>
        </nav>
      </header>
      <main id="landing-main">
        <div className="fs-public-width">
          <LandingHero />
        </div>
        <section id="workflow" className="fs-public-workflow" aria-labelledby="workflow-title">
          <div className="fs-public-width">
            <div className="fs-public-section-head">
              <p className="fs-public-kicker">이용 흐름</p>
              <h2 id="workflow-title">등록하고, 모으고, 함께 출발</h2>
            </div>
            <ol className="fs-public-steps">
              {STEPS.map(step => (
                <li key={step.number}>
                  <span className="fs-public-step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          id="roles"
          className="fs-public-roles fs-public-width"
          aria-labelledby="roles-title"
        >
          <div className="fs-public-section-head">
            <p className="fs-public-kicker">누가 쓰나요</p>
            <h2 id="roles-title">같은 계획, 각자의 업무</h2>
          </div>
          <div className="fs-public-role-row">
            <h3>화주</h3>
            <p>
              출하 등록부터 배정된 운송 계획까지.
              <br />내 화물의 상태, 예상 비용과 정산 내역을 한눈에.
            </p>
            <Link href={SAAS_PAGES.SIGNUP}>
              회사 가입하기 <span aria-hidden>↗</span>
            </Link>
          </div>
          <div className="fs-public-role-row">
            <h3>포워더</h3>
            <p>
              항차와 컨테이너를 등록하고, 흩어진 출하를 하나의 계획으로.
              <br />
              예약과 집하 준비부터 운송 중 화물 상태 확인까지.
            </p>
            <Link href={SAAS_PAGES.SIGNUP}>
              회사 가입하기 <span aria-hidden>↗</span>
            </Link>
          </div>
        </section>
      </main>
      <footer className="fs-public-footer fs-public-width">
        <div className="fs-public-logo">
          프레시스위치 <span aria-hidden>≈</span>
        </div>
        <p>신선 농산물 수출 공동적재 운송 관리</p>
        <span>Team ACK</span>
      </footer>
    </div>
  );
}
