# 프레시스위치 (FreshSwitch) · Frontend

2026 동남권 멀티도메인 모빌리티 해커톤 본선 결과물인 **공동적재·재최적화 웹 시뮬레이터**의 프론트엔드입니다.
여러 수출업체의 딸기·포도 출하를 하나의 운송계획으로 묶고, 취소·항공 전환·단전이 생기면 다시 계산한 결과를 보여줍니다.

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm dev                     # http://localhost:3000
```

| 환경변수                    | 설명                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`  | FastAPI 주소                                                                |
| `NEXT_PUBLIC_WS_BASE_URL`   | 센서 WebSocket 주소                                                         |
| `NEXT_PUBLIC_API_MOCKING`   | `enabled` 면 MSW 목업으로 동작 (백엔드 없이 개발, 시연 백업)                |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키. 카카오 디벨로퍼스에서 사용할 도메인을 등록해야 한다 |

## 스크립트

| 명령               | 설명                     |
| ------------------ | ------------------------ |
| `pnpm dev`         | 개발 서버                |
| `pnpm build`       | 프로덕션 빌드            |
| `pnpm lint`        | ESLint                   |
| `pnpm check-types` | 라우트 타입 생성 + `tsc` |
| `pnpm format`      | Prettier 적용            |

## 기술 스택

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** · **shadcn/ui** (radix) · sonner
- **TanStack Query** (서버 상태) · **Zustand** (클라이언트 상태) · **Zod** (응답 검증)
- **axios** · **MSW** (HTTP·WebSocket 목업)
- **WebSocket** (아두이노 센서) · **Recharts** · **GSAP** · **카카오맵** (react-kakao-maps-sdk)

## 폴더 구조

```
src/
  app/                 라우트. 시연 순서대로 plan → replan → sensor → mode-switch
    <route>/_components/  해당 화면 전용 컴포넌트
  apis/                API 호출 함수와 queryOptions (getXxx.ts)
  components/
    ui/                shadcn CLI 생성물 (직접 수정하지 않음, lint·prettier 제외)
    <name>/index.tsx   직접 만든 공용 컴포넌트
  consts/              엔드포인트, 라우트 등 상수
  hooks/               커스텀 훅 (useXxx.ts)
  mocks/               MSW 핸들러와 fixtures JSON
  types/               API 요청·응답 타입 (XxxT)
```

## shadcn 컴포넌트 추가

```bash
pnpm dlx shadcn@latest add <component>
```

`src/components/ui/` 에 소스가 생깁니다. 생성된 파일은 `cn` 패키지에서 `cn` 을 가져옵니다.

## API 계약

UI를 먼저 그리고 `types/` 의 타입과 `mocks/fixtures/` 의 JSON을 백엔드에 넘겨 계약으로 삼습니다.

- 필드 표기는 camelCase, 금액은 원 단위 정수, 시각은 ISO 8601 문자열
- 현재 타입과 엔드포인트는 **확정 전 초안**입니다
