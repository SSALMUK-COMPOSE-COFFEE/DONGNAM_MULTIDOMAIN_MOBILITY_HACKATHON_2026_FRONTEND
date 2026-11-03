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
| `pnpm dev:mock`    | SaaS 화면을 MSW 목업만으로 띄움 (백엔드 없이)       |
| `pnpm test:e2e`    | Playwright e2e (`e2e/`)                             |

## SaaS 목업 모드 (백엔드 백업)

SaaS 백엔드가 죽었을 때 화면을 MSW 목업만으로 띄운다. 목업 데이터는 브라우저 메모리에 있어서 새로고침하면 처음 상태로 돌아간다.
화면 안에서 로그아웃 → 다른 역할로 들어가기를 이어가면 상태가 남는다.

```bash
pnpm dev:mock                # http://localhost:3000/test/login
PORT=3107 pnpm dev:mock      # 포트 바꾸기
```

`dev:mock` 은 `NEXT_PUBLIC_API_MOCKING=enabled`, `NEXT_PUBLIC_BASE_PATH=/test` 로 `next dev` 를 띄운다.
Playwright 로 열 때는 `127.0.0.1` 이 아니라 `localhost` 로 연다 (개발 서버가 다른 호스트의 HMR 요청을 막는다).

### 목업 전용 컨테이너

`docker-compose.saas.yml` 의 `web-mock` 서비스는 목업 build arg 로 따로 빌드한 이미지(`freshswitch-saas-web-mock`)를 `127.0.0.1:18107` 에 띄운다.
`mock` 프로필이라 평소 `up` 에는 뜨지 않고, 실서비스 `web`(18105) 과 이미지·포트가 겹치지 않는다.

```bash
docker compose -f docker-compose.saas.yml up -d --build web-mock
curl -fsS -o /dev/null http://127.0.0.1:18107/test/login && echo ok
docker compose -f docker-compose.saas.yml stop web-mock
```

포트는 `MOCK_HOST_PORT` 로 바꾼다. 공개 주소에서 백업으로 돌리려면 nginx `/etc/nginx/conf.d/upstreams.conf` 의 `~^freshswitch\.ssalhub\.xyz/test(/|$)` 줄 포트를 18105 → 18107 로 바꾸고 `sudo nginx -t && sudo systemctl reload nginx` 한다. 백엔드가 살아나면 18105 로 되돌린다.

### e2e

`e2e/saas-mock.spec.ts` 는 목업 모드에서 화주 출하 등록 → 플랫폼 계획 생성·감축 재최적화 적용 → 화주 확정 → 포워더 실행 지시 확정·요청 수락 → 플랫폼 목록 확정까지 이어서 돌린다.

```bash
pnpm exec playwright install chromium   # 처음 한 번
pnpm test:e2e                           # 3107 포트에 dev:mock 을 띄우고 실행
E2E_PORT=3207 pnpm test:e2e             # 다른 포트에 dev:mock 을 띄우고 실행
E2E_BASE_URL=http://localhost:18107 pnpm test:e2e   # 목업 컨테이너에 대고 실행
```

Next 는 한 체크아웃에서 `next dev` 를 하나만 허용한다. `pnpm dev` 등 다른 개발 서버가 떠 있으면 `pnpm test:e2e` 는 `Another next dev server is already running` 으로 바로 끝난다.
그럴 때는 그 서버를 끄고 돌리거나, 이미 떠 있는 `dev:mock` 이 있으면 그 포트를 `E2E_PORT` (또는 `E2E_BASE_URL`) 로 넘겨 재사용한다. 재사용은 `E2E_PORT` 포트의 `/test/login` 이 응답할 때만 된다.

## SaaS 이미지 태그와 되돌리기

이미지 이름은 `freshswitch-saas-web:${WEB_TAG}` (목업은 `freshswitch-saas-web-mock:${WEB_TAG}`)이고, `WEB_TAG` 를 비우면 `latest` 다.
배포할 때 커밋 해시로 태그해 두면 이전 이미지로 바로 되돌릴 수 있다.

```bash
# 배포: 현재 커밋 해시로 빌드하고 latest 도 같은 이미지로 맞춘다
export WEB_TAG=$(git rev-parse --short HEAD)
docker compose -f docker-compose.saas.yml build web
docker tag freshswitch-saas-web:$WEB_TAG freshswitch-saas-web:latest
docker compose -f docker-compose.saas.yml up -d --no-build web

# 남아 있는 태그 보기
docker image ls freshswitch-saas-web

# 되돌리기: 이전 태그로 다시 빌드하지 않고 띄운다
WEB_TAG=<이전 해시> docker compose -f docker-compose.saas.yml up -d --no-build web
docker tag freshswitch-saas-web:<이전 해시> freshswitch-saas-web:latest
```

`docker image prune -f` 는 태그 없는(dangling) 이미지만 지우므로 해시 태그 이미지는 남는다. 오래된 태그는 `docker image rm freshswitch-saas-web:<해시>` 로 지운다.

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
