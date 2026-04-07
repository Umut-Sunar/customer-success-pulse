import { useMemo } from 'react';
import { useAccounts } from './useAccounts';
import { useDataStore } from '../src/store/dataStore';
import type { AccountWithClients } from '../src/types/account.types';
import type { AccountMetrics } from '../src/lib/account-metrics';
import { enrichAccounts } from '../src/lib/account-metrics';

export type EnrichedAccount = AccountWithClients & AccountMetrics;

export function useEnrichedAccounts() {
  const { accounts, loading, error, refetch } = useAccounts();
  const meetings = useDataStore((s) => s.meetings);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const customerInsights = useDataStore((s) => s.customerInsights);
  const liveOrders = useDataStore((s) => s.liveOrders);
  const pmScores = useDataStore((s) => s.pmScores);

  const enriched = useMemo<EnrichedAccount[]>(() => {
    if (!accounts.length) return [];
    return enrichAccounts(accounts, meetings, riskSignals, customerInsights, liveOrders, pmScores);
  }, [accounts, meetings, riskSignals, customerInsights, liveOrders, pmScores]);

  const stats = useMemo(
    () => ({
      totalAccounts: enriched.length,
      totalMRR: enriched.reduce((s, a) => s + a.total_mrr, 0),
      touchedCount: enriched.filter((a) => a.touch_status === 'Touched').length,
      liveCount: enriched.filter((a) => a.dominant_status === 'Live').length,
      setupCount: enriched.filter((a) => a.dominant_status === 'Setup').length,
      churnedCount: enriched.filter((a) => a.dominant_status === 'Churned').length,
      highChurnCount: enriched.filter((a) => a.churn_risk === 'high').length,
    }),
    [enriched]
  );

  return { accounts: enriched, loading, error, refetch, stats };
}
