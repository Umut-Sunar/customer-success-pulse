const DB_NAME = 'PulseCS_Data';
const DB_VERSION = 2;
const STORES = [
  'meetings',
  'pmScores',
  'customerInsights',
  'riskSignals',
  'knowledgeItems',
  'pipelineOrders',
  'liveOrders',
  'soGrouping',
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

export async function idbSave(storeName: string, data: object[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    data.forEach((item, i) =>
      store.put({ ...(item as Record<string, unknown>), _idb_id: i + 1 })
    );
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function idbLoad<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const result = (req.result as Array<Record<string, unknown> & { _idb_id?: number }>).map(
        ({ _idb_id: _removed, ...rest }) => rest as T
      );
      resolve(result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function idbClear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function idbClearAll(): Promise<void> {
  await Promise.all(STORES.map((s) => idbClear(s)));
}
