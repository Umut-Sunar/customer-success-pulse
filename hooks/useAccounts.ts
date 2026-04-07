import { useState, useEffect, useCallback } from 'react';
import type { AccountWithClients } from '../src/types/account.types';

function normalizeFetchError(e: unknown): string {
  if (e instanceof TypeError) {
    const msg = e.message || '';
    if (msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('NetworkError')) {
      return 'API server unreachable (did you run npm run dev:api?)';
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountWithClients[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) {
        let detail = '';
        try {
          const j: unknown = await res.json();
          if (j && typeof j === 'object' && 'error' in j) {
            detail = String((j as { error: unknown }).error);
          }
        } catch { /* ignore non-JSON body */ }
        throw new Error(detail || `Failed to fetch accounts (${res.status})`);
      }
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(normalizeFetchError(e));
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to delete account');
  }
}
