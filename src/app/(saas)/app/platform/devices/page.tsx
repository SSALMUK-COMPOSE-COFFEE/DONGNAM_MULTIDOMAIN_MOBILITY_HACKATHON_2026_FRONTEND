import { redirect } from 'next/navigation';

import { ADMIN_PATHS } from '@/app/(saas)/app/platform/_components/admin/admin-paths';

export default function LegacyPlatformOperationPage() {
  redirect(ADMIN_PATHS.HOME);
}
