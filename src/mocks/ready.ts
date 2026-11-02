import { IS_API_MOCKING } from '@/consts/api';

let resolveReady = () => {};

/**
 * 목업 모드에서 MSW 워커가 요청을 가로챌 준비가 되면 풀리는 약속.
 * 워커보다 요청이 먼저 나가면 목업 대신 실제 서버로 가므로, 요청을 보내는 쪽(axios·SSE)이 이것을 기다린다.
 * 화면 렌더링은 막지 않는다 (막으면 Next 의 instant 검증이 페이지를 그리지 못해 개발 모드에서 오류가 난다)
 */
export const mockingReady: Promise<void> = IS_API_MOCKING
  ? new Promise(resolve => {
      resolveReady = resolve;
    })
  : Promise.resolve();

export const markMockingReady = () => resolveReady();
