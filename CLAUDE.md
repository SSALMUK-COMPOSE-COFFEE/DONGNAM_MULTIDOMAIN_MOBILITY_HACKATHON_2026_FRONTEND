@AGENTS.md

# 프레시스위치 Frontend

해커톤 본선(2026.11.8~10) 시연용 웹 시뮬레이터. 1920×1080 빔프로젝터 화면 기준 데스크톱 전용으로 만든다.

## 서비스 내용

여러 수출업체의 딸기·포도 출하를 하나의 운송계획으로 묶는 멀티도메인(육상·해상·항공) 콜드체인 최적화 서비스다.
운임만이 아니라 집하·보관비, 품질 손실 위험, 지연 비용까지 합친 **실제 절감액**으로 판단하고, 화주가 아낀 돈에서만 수수료(기본 25%)를 받는다.

- 해상이 주 경로(CA 컨테이너), 항공은 먼 시장·급한 물량의 대안이다. 육상은 선과장(진주·산청·밀양 등) 순회 냉장트럭 집하다
- 가상 컨테이너: 출항 D-7에 여러 업체 물량을 등록하고, D-3에 적재율이 기준(예: 80%) 이상이면 확정, 미달이면 이월·항공 전환·조합 변경 중 추천한다
- 딸기와 SO2 처리 포도는 같은 배에 실어도 컨테이너는 나눈다
- 손실률 책임제: 출하 전 예상 손실률을 공개하고, 실측이 넘으면 수수료를 차감한다
- 핵심 숫자: 부산→홍콩 딸기 손실률은 단전이 없으면 1~2%, 단전이 있으면 6~8%. 2026.4 항공 유류할증료 kg당 470 → 2,060원

시연 시나리오 (각 3분 안에 끝까지 돈다):

1. 합승·재계획: 진주 농협이 딸기 3t(홍콩) 입력 → 산청·밀양 물량과 한 컨테이너로 묶고 픽업 경로·화주별 절감액 표시 → 산청 1t 취소 → '다른 물량 당겨 채우기' vs '다음 배 이월' 비교
2. 운임 쇼크: 유류할증료를 470 → 2,060원으로 올리면 계획이 바뀐다 (발표 하이라이트)
3. 단전 복구: 아두이노 냉각 박스 전원을 끊으면 경고 → 예상 손실률 상승 → 반입 조정·이동형 전원 배정 알림
4. 항공 전환: 접안 지연 예측이 판매 가능 기간을 넘으면 출하 전 김해·인천 항공 제안

## 내부 자료

- 기획서·참가신청서·프로토타입 HTML·스타일 레퍼런스 이미지는 `private/` 에 둔다. 폴더째 gitignore 되어 있다
- 공개 레포다. `private/` 의 파일, 팀원 개인정보(연락처·이메일), `.env.local` 은 절대 커밋하지 않는다
- 화면 문구·수치의 근거는 `private/` 의 기획서를, 시각 스타일은 `private/style ex.png`(발표 자료)를 참고한다

## 규칙

- 커밋 메시지와 PR 본문에 Claude 관련 표시(Co-Authored-By, Generated with Claude Code 등)를 넣지 않는다
- 커밋 메시지는 `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:` 접두사 + 한국어
- 브랜치는 `feat/xxx`, `fix/xxx`, `chore/xxx` 로 main 에서 따고 PR 로 머지한다. main 에 푸시하면 자동 배포된다
- 커밋 전에 `pnpm lint`, `pnpm check-types`, `pnpm format:check` 를 통과시킨다
- `src/components/ui/` 는 shadcn CLI 생성물이다. 가능하면 수정하지 말고 감싸서 쓴다
- 스타일은 발표 자료를 따른다: 흰 카드 + 연한 파랑 테두리, 위→아래 흰색→연파랑 배경, 남색 알약 배지(단계 번호), 큰 굵은 제목에 파란 강조, 결론은 남색 배너
- 폰트는 Noto Sans KR 하나만 쓴다. 제목은 `font-black`, 강조 숫자는 `font-bold`
- 색은 `globals.css` 토큰을 쓴다
  - 팔레트: `navy`(주 색·배지·배너), `brand`(파랑 강조), `cyan`, `grape`·`grape-soft`(포도), `slate`(비교에서 진 쪽), `line`(테두리)
  - 의미: `sea`(해상·주 경로), `air`(항공·대안), `berry`(문제·위험), `gov`(정책·데이터), `ok`(정상·절감)
  - 화주 구분: 딸기는 `navy` → `brand` → `cyan`, 포도는 `grape` → `grape-soft`
- 숫자는 `num` 유틸리티(tabular-nums)로 표시한다. 금액은 `utils/format.ts` 로 만 원 단위 표시
- 예시 수치는 화면에 "예시", 우리가 정한 값은 "가정"으로 표시한다
- 화면 문구와 주석은 한국어로 쓴다

## 코드 컨벤션

- 화면 전용 컴포넌트는 `app/<route>/_components/`, 공용 컴포넌트는 `components/<name>/index.tsx`
- 훅은 `hooks/useXxx.ts`, 스토어는 `stores/useXxxStore.ts`(Zustand), 상수는 `consts/`
- 타입은 `XxxT` 접미사 (props 는 `XxxPropsT`), API 함수는 `apis/getXxx.ts`·`postXxx.ts` 에 `xxxQueryOptions` 와 함께 둔다
- 엔드포인트는 `consts/api.ts` 의 `ENDPOINTS` 에만, 라우트는 `consts/route.ts` 의 `ROUTES` 에만 쓴다
- 서버 상태는 TanStack Query, 새로고침 뒤에도 남아야 하는 클라이언트 상태만 Zustand persist 로 둔다
- 쿼리 화면은 로딩(Skeleton) · 에러(재시도 가능) · 빈 상태를 모두 처리한다
- 브라우저 전용 라이브러리는 `next/dynamic` 의 `ssr: false` 로 불러온다 (`msw/browser` 등)
- `undefined` 리터럴 사용 금지 (ESLint `no-undefined`)

## API

백엔드 OpenAPI가 기준이다 (https://freshswitch.ssalhub.xyz/api/docs, 모든 경로 `/api` 접두사).

- 타입은 손으로 쓰지 않는다. `pnpm gen:api` 로 `types/openapi.d.ts` 를 만들고 `types/api.ts` 에서 `SchemaT<'Name'>` 별칭을 쓴다
- 필드는 snake_case 그대로 쓴다. 금액은 원 단위 정수, 시각은 ISO 8601
- 생성 타입의 `| null` 은 실제로 null 이 온다. 단언하지 말고 처리한다
- 계획은 서버 메모리에만 있어서 재시작·`POST /api/demo/reset` 뒤에는 404 가 온다. `useCurrentPlan` 이 처리한다
- 실시간: 알림은 SSE(`useAlertStream`), 디지털 트윈은 1초 폴링. WebSocket 은 없다
- 시연 흐름은 `GET /api/demo/script` 를 따른다
- `mocks/fixtures/` 는 실제 응답을 저장한 것이다. 백엔드 응답이 바뀌면 다시 저장한다
