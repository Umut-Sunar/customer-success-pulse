import Papa from 'papaparse';
import { TenantCSVRow, TenantImportResult } from '../types/tenant';

export async function parseCSV(file: File): Promise<TenantCSVRow[]> {
  // Convert File to text first - PapaParse's File/FileReader handling
  // is unreliable in Node.js environments and can hang indefinitely
  const text = await file.text();
  
  const results = Papa.parse<TenantCSVRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => {
      // Normalize header names (handle variations)
      const normalized = header.trim();
      if (normalized.toLowerCase().includes('tenant') && normalized.toLowerCase().includes('name')) {
        return 'Tenant Name';
      }
      if (normalized.toLowerCase() === 'account') {
        return 'Account';
      }
      if (normalized.toLowerCase().includes('owner')) {
        return 'Tenant Owner';
      }
      return normalized;
    },
  });

  if (results.errors.length > 0) {
    console.warn('CSV parsing warnings:', results.errors);
  }
  
  return results.data;
}

export function validateTenantRow(row: TenantCSVRow): { valid: boolean; error?: string } {
  if (!row['Tenant Name'] || row['Tenant Name'].trim() === '') {
    return { valid: false, error: 'Tenant Name is required' };
  }
  if (!row['Account'] || row['Account'].trim() === '') {
    return { valid: false, error: 'Account is required' };
  }
  return { valid: true };
}

export function cleanTenantData(row: TenantCSVRow): TenantCSVRow {
  return {
    'Tenant Name': row['Tenant Name']?.trim() || '',
    'Account': row['Account']?.trim() || '',
    'Tenant Owner': row['Tenant Owner']?.trim() || '',
  };
}

