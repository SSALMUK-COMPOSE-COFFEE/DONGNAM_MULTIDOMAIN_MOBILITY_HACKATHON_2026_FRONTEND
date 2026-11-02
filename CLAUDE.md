@AGENTS.md

# 프레시스위치 Frontend

해커톤 본선(2026.11.8~10) 시연용 웹 시뮬레이터. 1920×1080 빔프로젝터 화면 기준 데스크톱 전용으로 만든다.

## 규칙

- 커밋 메시지와 PR 본문에 Claude 관련 표시(Co-Authored-By, Generated with Claude Code 등)를 넣지 않는다
- 커밋 메시지는 `feat:`, `fix:`, `chore:`, `refactor:`, `test:` 접두사 + 한국어
- `src/components/ui/` 는 shadcn CLI 생성물이다. 가능하면 수정하지 말고 감싸서 쓴다
- 색은 `globals.css` 토큰을 쓴다: `sea`(해상·주 경로), `air`(항공·대안), `berry`(문제·위험), `gov`(정책·데이터), `ok`(정상·절감)
- 숫자는 `num` 유틸리티(IBM Plex Mono, tabular-nums)로 표시한다
- 예시 수치는 화면에 "예시", 우리가 정한 값은 "가정"으로 표시한다

## 코드 컨벤션

- 타입은 `XxxT` 접미사, API 함수는 `apis/getXxx.ts` 에 `xxxQueryOptions` 와 함께 둔다
- 엔드포인트는 `consts/api.ts` 의 `ENDPOINTS` 에만 쓴다
- 외부에서 오는 실시간 데이터(WebSocket)는 Zod 스키마로 검증한다
- 브라우저 전용 라이브러리는 `next/dynamic` 의 `ssr: false` 로 불러온다 (`msw/browser` 등)
- `undefined` 리터럴 사용 금지 (ESLint `no-undefined`)

## API 계약

FE가 주도한다. 화면을 그리며 `types/` 와 `mocks/fixtures/` 를 정하고 백엔드(FastAPI)에 넘긴다.
camelCase, 금액은 원 단위 정수, 시각은 ISO 8601.
