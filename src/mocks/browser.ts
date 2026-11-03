import { setupWorker } from 'msw/browser';

import { handlers } from '@/mocks/handlers';
import { saasHandlers } from '@/mocks/saas/handlers';

export const worker = setupWorker(...saasHandlers, ...handlers);
