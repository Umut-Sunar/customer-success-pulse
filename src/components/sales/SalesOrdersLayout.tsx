import { useDataStore } from '../../store/dataStore';
import { EmptyState } from '../shared/EmptyState';
import { SalesOrders } from './SalesOrders';

export interface SalesOrdersLayoutProps {
  onOpenUploadModal?: () => void;
}

export function SalesOrdersLayout({ onOpenUploadModal }: SalesOrdersLayoutProps) {
  const liveOrders = useDataStore((s) => s.liveOrders);
  const pipelineOrders = useDataStore((s) => s.pipelineOrders);
  const isParsingSales = useDataStore((s) => s.isParsingSales);
  const hasData = liveOrders.length > 0 || pipelineOrders.length > 0;

  if (!hasData && !isParsingSales) {
    return (
      <EmptyState
        title="No sales data yet"
        description="Upload Sales_Orders.csv and Sales_Orders_2.csv from your CRM to see pipeline and live orders."
        action={
          onOpenUploadModal ? (
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Upload Data Files
            </button>
          ) : undefined
        }
      />
    );
  }

  return <SalesOrders />;
}
