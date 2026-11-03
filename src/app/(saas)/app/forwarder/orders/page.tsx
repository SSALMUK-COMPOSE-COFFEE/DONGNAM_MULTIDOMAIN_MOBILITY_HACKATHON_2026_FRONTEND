import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { OrdersView } from '@/app/(saas)/app/forwarder/_components/orders-view';

export default function ForwarderOrdersPage() {
  return (
    <>
      <ForwarderPageHeader
        title="실행 지시"
        headline="화주가 수락한 변경을"
        highlight="한 번에 확정합니다"
      />
      <OrdersView />
    </>
  );
}
