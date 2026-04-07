import { useState, useEffect, useCallback } from 'react';
import type { Customer } from '../src/types/customer.types';

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

export function useCustomers(status?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        status && status !== 'All'
          ? `/api/customers?status=${encodeURIComponent(status)}`
          : '/api/customers';
      const res = await fetch(url);
      if (!res.ok) {
        let detail = '';
        try {
          const j: unknown = await res.json();
          if (j && typeof j === 'object' && 'error' in j) {
            detail = String((j as { error: unknown }).error);
          }
        } catch {
          /* ignore non-JSON body */
        }
        throw new Error(detail || `Failed to fetch customers (${res.status})`);
      }
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(normalizeFetchError(e));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, error, refetch: fetchCustomers };
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to create customer');
  }
  return res.json();
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to update customer');
  }
  return res.json();
}
