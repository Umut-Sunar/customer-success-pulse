# İterasyon 3 — IndexedDB Persistence (CSV Verisi Sayfa Yenilemede Kalsın)

## Durum
```
[x] 3.1 — IndexedDB wrapper (lib/indexeddb.ts)
[x] 3.2 — dataStore.ts güncelle (hydration on mount)
[x] 3.3 — App hydration banner (DataUploadModal değişmedi; persistence store setter’larda)
[x] 3.4 — "Clear Data" butonu header'a ekle
```

---

## Problem

Şu an tüm CSV verisi Zustand'da tutuluyor. Sayfa yenilenince sıfırlanıyor.
Her oturumda 7 CSV'yi tekrar yüklemek gerekiyor.

## Çözüm: IndexedDB

Tarayıcının yerel veritabanı. localStorage'dan farklı olarak büyük veri (MB'larca CSV satırı) tutabilir.
Sayfa kapanıp açılsa bile veri kalır.

---

## Cursor Prompt

```
Continue Pulse CS. Iterations 1-2 complete.
Now add IndexedDB persistence so uploaded CSV data survives page refreshes.
DO NOT modify any API routes, DB schema, or existing components.
Only modify: src/store/dataStore.ts, src/components/shared/DataUploadModal.tsx, App.tsx (header section only).

## Step 3.1 — Create src/lib/indexeddb.ts

```typescript
const DB_NAME = 'PulseCS_Data';
const DB_VERSION = 1;
const STORES = [
  'meetings', 'pmScores', 'customerInsights',
  'riskSignals', 'knowledgeItems', 'pipelineOrders', 'liveOrders'
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: '_idb_id', autoIncrement: true });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSave<T>(storeName: string, data: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    data.forEach((item, i) => store.put({ ...item, _idb_id: i + 1 }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbLoad<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => {
      const result = req.result.map(({ _idb_id, ...rest }) => rest as T);
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearAll(): Promise<void> {
  await Promise.all(STORES.map(s => idbClear(s)));
}
```

## Step 3.2 — Update src/store/dataStore.ts

ADD these changes to the existing Zustand store:

1. Add `isHydrated: boolean` state field (default: false)
2. Add `setIsHydrated: (v: boolean) => void` action
3. In each setter (setMeetings, setPmScores, etc.) — ALSO call idbSave after updating state:

```typescript
// Example for setMeetings:
setMeetings: (data) => {
  set({ meetings: data });
  idbSave('meetings', data).catch(console.error);
},
```

4. Add a `hydrateFromIndexedDB` async function (not a Zustand action, export separately):

```typescript
// Export this function separately (not part of the store)
export async function hydrateFromIndexedDB(store: ReturnType<typeof useDataStore.getState>) {
  const [
    meetings, pmScores, customerInsights,
    riskSignals, knowledgeItems, pipelineOrders, liveOrders
  ] = await Promise.all([
    idbLoad('meetings'),
    idbLoad('pmScores'),
    idbLoad('customerInsights'),
    idbLoad('riskSignals'),
    idbLoad('knowledgeItems'),
    idbLoad('pipelineOrders'),
    idbLoad('liveOrders'),
  ]);

  if (meetings.length) store.setMeetings(meetings as any);
  if (pmScores.length) store.setPmScores(pmScores as any);
  if (customerInsights.length) store.setCustomerInsights(customerInsights as any);
  if (riskSignals.length) store.setRiskSignals(riskSignals as any);
  if (knowledgeItems.length) store.setKnowledgeItems(knowledgeItems as any);
  if (pipelineOrders.length) store.setPipelineOrders(pipelineOrders as any);
  if (liveOrders.length) store.setLiveOrders(liveOrders as any);

  // Mark which files are uploaded based on what has data
  const uploaded: Record<string, boolean> = {};
  if (meetings.length) uploaded['meetings_master'] = true;
  if (pmScores.length) uploaded['pm_scores'] = true;
  if (customerInsights.length) uploaded['customer_insights'] = true;
  if (riskSignals.length) uploaded['risk_signals'] = true;
  if (knowledgeItems.length) uploaded['knowledge_management'] = true;
  if (pipelineOrders.length) uploaded['sales_pipeline'] = true;
  if (liveOrders.length) uploaded['sales_live'] = true;
  
  Object.keys(uploaded).forEach(k => store.markFileUploaded(k));
  store.setIsHydrated(true);
}
```

5. Update `clearAllData` to also call `idbClearAll()`:
```typescript
clearAllData: () => {
  idbClearAll().catch(console.error);
  set({ meetings: [], pmScores: [], ... , uploadedFiles: {} });
},
```

## Step 3.3 — Update App.tsx (hydration on mount)

In App.tsx, ADD a useEffect that runs once on mount to hydrate from IndexedDB:

```typescript
import { hydrateFromIndexedDB } from './src/store/dataStore';
import { useDataStore } from './src/store/dataStore';

// Inside the App component, after auth checks:
const storeState = useDataStore.getState();
useEffect(() => {
  hydrateFromIndexedDB(storeState).catch(console.error);
}, []);
```

ALSO add a loading state: while `!isHydrated`, show a subtle loading indicator
(NOT a full-screen spinner — just a small "Loading saved data..." banner at the top).

## Step 3.4 — Add "Clear Data" button to header

In App.tsx header area (next to "Update Data" button), add:
- "Clear Data" button with Trash2 icon
- Shows only when `Object.keys(uploadedFiles).length > 0`
- On click: confirm dialog → calls `clearAllData()` → reloads page

## Verification Checklist
- [ ] Upload meetings_master.csv → refresh page → data still shows in Meeting Intel
- [ ] Upload all 7 CSVs → close browser → reopen → all data present
- [ ] "Clear Data" button appears after upload
- [ ] Click "Clear Data" → confirm → all Meeting Intel shows EmptyState
- [ ] New uploads after clear work correctly
- [ ] Build passes, no TypeScript errors

## Progress Log
- Date: ___
- Notes: ___
```
