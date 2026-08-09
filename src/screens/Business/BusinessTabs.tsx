import { SectionTabs } from '../../components/shared/SectionTabs';
import { useBusinessContext } from '../../api/business';

// Shared header for the Business section: context surfaces (overview, sales
// base data, P&L) that the loop's findings stand on.
export function BusinessTabs() {
  const { data } = useBusinessContext();
  return (
    <SectionTabs
      tabs={[
        { to: '/business/overview', label: 'The business', match: '/business/overview' },
        { to: '/business/sku', label: `Sales by ${data?.skuDimension ?? 'SKU'}`, match: '/business/sku' },
        { to: '/business/customers', label: `Sales by ${data?.customerDimension ?? 'customer'}`, match: '/business/customers' },
        { to: '/business/pl', label: 'P&L', match: '/business/pl' },
      ]}
    />
  );
}
