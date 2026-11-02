import { redirect } from 'next/navigation';

import { ROUTES } from '@/consts/route';

export default function Home() {
  redirect(ROUTES.PLAN);
}
