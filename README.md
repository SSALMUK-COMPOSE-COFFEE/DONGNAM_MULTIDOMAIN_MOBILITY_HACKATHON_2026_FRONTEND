# 프레시스위치 (FreshSwitch) · Frontend

2026 동남권 멀티도메인 모빌리티 해커톤 본선 결과물인 **공동적재·재최적화 웹 시뮬레이터**의 프론트엔드입니다.
여러 수출업체의 딸기·포도 출하를 하나의 운송계획으로 묶고, 취소·항공 전환·단전이 생기면 다시 계산한 결과를 보여줍니다.

- 백엔드: [DONGNAM_MULTIDOMAIN_MOBILITY_HACKATHON_2026_BACKEND](https://github.com/SSALMUK-COMPOSE-COFFEE/DONGNAM_MULTIDOMAIN_MOBILITY_HACKATHON_2026_BACKEND)
- API 문서: https://freshswitch.ssalhub.xyz/api/docs

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm dev                     # http://localhost:3000
```

| 환경변수                    | 설명                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`  | 백엔드 주소. 기본은 배포 서버, 로컬 백엔드는 `http://localhost:8000`        |
| `NEXT_PUBLIC_API_MOCKING`   | `enabled` 면 MSW 목업으로 동작 (백엔드가 죽었을 때 시연 백업)               |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키. 카카오 디벨로퍼스에서 사용할 도메인을 등록해야 한다 |

## 스크립트

| 명령               | 설명                                                |
| ------------------ | --------------------------------------------------- |
| `pnpm dev`         | 개발 서버                                           |
| `pnpm build`       | 프로덕션 빌드                                       |
| `pnpm lint`        | ESLint                                              |
| `pnpm check-types` | 라우트 타입 생성 + `tsc`                            |
| `pnpm format`      | Prettier 적용                                       |
| `pnpm gen:api`     | 배포 서버 OpenAPI로 `src/types/openapi.d.ts` 재생성 |

## 기술 스택

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** · **shadcn/ui** (radix) · sonner
- **TanStack Query** (서버 상태·폴링) · **Zustand** (클라이언트 상태)
- **axios** · **openapi-typescript** (API 타입 생성) · **MSW** (HTTP·SSE 목업)
- **Recharts** · **GSAP** · **카카오맵** (react-kakao-maps-sdk)

## API 연동

- 타입은 백엔드 OpenAPI에서 생성합니다. 백엔드가 바뀌면 `pnpm gen:api` 후 `pnpm check-types` 로 깨지는 곳을 찾습니다.
- 필드는 백엔드 그대로 **snake_case** 로 씁니다 (변환하지 않음).
- 실시간 데이터
  - 콜드체인 알림: SSE `GET /api/coldchain/alerts/stream` (`useAlertStream`)
  - 온도·손실 디지털 트윈: `GET /api/coldchain/containers/{id}` 를 1초마다 폴링
- 시연 흐름은 백엔드 `GET /api/demo/script` 를 기준으로 합니다.
- `src/mocks/fixtures/` 는 실제 백엔드 응답을 저장한 것입니다. 목업 모드에서 단전 시뮬레이션을 시작하면 저장된 측정값을 시간에 맞춰 재생합니다.

## 폴더 구조

```
src/
  app/                    라우트. 시연 순서대로 plan → replan → sensor → mode-switch
    <route>/_components/  해당 화면 전용 컴포넌트
  apis/                   API 호출 함수와 queryOptions (getXxx.ts, postXxx.ts)
  components/
    ui/                   shadcn CLI 생성물 (직접 수정하지 않음, lint·prettier 제외)
    <name>/index.tsx      직접 만든 공용 컴포넌트
  consts/                 엔드포인트, 라우트, 시연 상수
  hooks/                  커스텀 훅 (useXxx.ts)
  mocks/                  MSW 핸들러와 fixtures JSON
  stores/                 Zustand 스토어
  types/                  openapi.d.ts(생성) 와 별칭 api.ts
  utils/                  포맷 함수 등
```

## shadcn 컴포넌트 추가

```bash
pnpm dlx shadcn@latest add <component>
```

`src/components/ui/` 에 소스가 생깁니다. 생성된 파일은 `cn` 패키지에서 `cn` 을 가져옵니다.
