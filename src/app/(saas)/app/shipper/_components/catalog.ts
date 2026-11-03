import type { IntakeFormOptionsT } from '@/components/intake-form';
import type { PlanSessionT } from '@/types/api';
import type { ShipperCatalogT } from '@/types/saas-shipper';

export const toIntakeOptions = (catalog: ShipperCatalogT): IntakeFormOptionsT => {
  const destinationIds = new Set(catalog.voyages.map(({ destination }) => destination));

  return {
    products: catalog.products.map(({ id, name }) => ({ id, label: name })),
    shippers: catalog.shippers.map(({ id, name, packhouse_id }) => {
      const packhouse = catalog.packhouses.find(
        ({ id: packhouseId }) => packhouseId === packhouse_id
      );

      return { id, label: packhouse ? `${name} · ${packhouse.name}` : name };
    }),
    destinations: catalog.ports
      .filter(({ id }) => destinationIds.has(id))
      .map(({ id, name }) => ({ id, label: name })),
  };
};

export const viewerShipperIdOf = (catalog: ShipperCatalogT | null | undefined) =>
  catalog?.shippers[0]?.id ?? '';

const hasCoordinates = ({ lat, lon }: { lat: number | null; lon: number | null }) =>
  typeof lat === 'number' && typeof lon === 'number';

export const withLocatedPackhouses = (session: PlanSessionT): PlanSessionT => ({
  ...session,
  scenario: {
    ...session.scenario,
    packhouses: session.scenario.packhouses.filter(hasCoordinates),
  },
});

export const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
};
