import axios from 'axios';

import { API_BASE_URL } from '@/consts/api';

export const clientApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});
