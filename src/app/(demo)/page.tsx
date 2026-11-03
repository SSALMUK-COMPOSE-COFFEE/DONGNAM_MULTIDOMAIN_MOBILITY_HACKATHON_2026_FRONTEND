import { redirect } from 'next/navigation';

import { ROUTES } from '@/consts/route';
import { IS_SAAS_BUILD, SAAS_PAGES } from '@/consts/route-saas';

export default function Home() {
  redirect(IS_SAAS_BUILD ? SAAS_PAGES.APP : ROUTES.INTAKE);
}
