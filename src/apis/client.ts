import axios from 'axios';

import { API_BASE_URL } from '@/consts/api';
import { mockingReady } from '@/mocks/ready';

export const clientApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

// 목업 모드면 MSW 워커가 준비된 뒤에 요청을 보낸다 (아니면 바로 풀린다)
clientApi.interceptors.request.use(async config => {
  await mockingReady;

  return config;
});
