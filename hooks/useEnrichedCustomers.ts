import { useMemo } from 'react';
import { useCustomers } from './useCustomers';
import { useDataStore } from '../src/store/dataStore';
import { enrichCustomers } from '../src/lib/computed-metrics';
import type { Customer } from '../src/types/customer.types';
import type { ComputedMetrics } from '../src/lib/computed-metrics';

export type EnrichedCustomer = Customer & ComputedMetrics;

export function useEnrichedCustomers(status?: string) {
  const { customers, loading, error, refetch } = useCustomers(status);
  const meetings = useDataStore((s) => s.meetings);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const customerInsights = useDataStore((s) => s.customerInsights);
  const liveOrders = useDataStore((s) => s.liveOrders);

  const enriched = useMemo(() => {
    if (!customers.length) return [];
    return enrichCustomers(customers, meetings, riskSignals, customerInsights, liveOrders);
  }, [customers, meetings, riskSignals, customerInsights, liveOrders]);

  const stats = useMemo(
    () => ({
      totalMRR: enriched.reduce((s, c) => s + c.mrr, 0),
      touchedCount: enriched.filter((c) => c.touch_status === 'Touched').length,
      touchedMRR: enriched
        .filter((c) => c.touch_status === 'Touched')
        .reduce((s, c) => s + c.mrr, 0),
      onboardingCount: enriched.filter((c) => c.status === 'Onboarding').length,
      atRiskCount: enriched.filter(
        (c) => c.churn_risk === 'high' || c.churn_risk === 'medium'
      ).length,
      highChurnCount: enriched.filter((c) => c.churn_risk === 'high').length,
    }),
    [enriched]
  );

  return { customers: enriched, loading, error, refetch, stats };
}
