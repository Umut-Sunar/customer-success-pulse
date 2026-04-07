import { create } from 'zustand';
import { MeetingMaster, PMScore, CustomerInsight, RiskSignal, KnowledgeItem } from '../types/meeting.types';
import { SalesOrderPipeline, SalesOrderLive } from '../types/sales.types';
import type { SoChildToParentMap } from '../types/sales-grouping.types';
import { idbSave, idbLoad, idbClearAll } from '../lib/indexeddb';
import { pruneParentMap, validateSoParentLink, type LinkSoParentResult } from '../lib/sales-order-groups';

interface DataStore {
  // Meeting Intelligence data
  meetings: MeetingMaster[];
  pmScores: PMScore[];
  customerInsights: CustomerInsight[];
  riskSignals: RiskSignal[];
  knowledgeItems: KnowledgeItem[];

  // Sales data
  pipelineOrders: SalesOrderPipeline[];
  liveOrders: SalesOrderLive[];

  /** Alt SO → ana SO (record_id); kök satırlar map’te yok. */
  liveParentByChildId: SoChildToParentMap;
  pipelineParentByChildId: SoChildToParentMap;

  // Upload tracking
  uploadedFiles: Record<string, boolean>;

  // Hydration (IndexedDB loaded)
  isHydrated: boolean;

  // Parsing state (for loading skeletons)
  isParsingMeetings: boolean;
  isParsingPmScores: boolean;
  isParsingSales: boolean;

  // Actions
  setIsHydrated: (v: boolean) => void;
  setParsingMeetings: (v: boolean) => void;
  setParsingPmScores: (v: boolean) => void;
  setParsingSales: (v: boolean) => void;
  setMeetings: (data: MeetingMaster[]) => void;
  setPmScores: (data: PMScore[]) => void;
  setCustomerInsights: (data: CustomerInsight[]) => void;
  setRiskSignals: (data: RiskSignal[]) => void;
  setKnowledgeItems: (data: KnowledgeItem[]) => void;
  setPipelineOrders: (data: SalesOrderPipeline[]) => void;
  setLiveOrders: (data: SalesOrderLive[]) => void;
  deletePipelineOrder: (recordId: string) => void;
  updatePipelineOrder: (recordId: string, patch: Partial<SalesOrderPipeline>) => void;
  setSoParent: (
    kind: 'live' | 'pipeline',
    childId: string,
    parentId: string | null
  ) => LinkSoParentResult;
  markFileUploaded: (fileKey: string) => void;
  clearAllData: () => void;
}

function persistSoGrouping(live: SoChildToParentMap, pipeline: SoChildToParentMap): void {
  idbSave('soGrouping', [{ liveParentByChildId: live, pipelineParentByChildId: pipeline }]).catch(console.error);
}

export const useDataStore = create<DataStore>((set) => ({
  meetings: [],
  pmScores: [],
  customerInsights: [],
  riskSignals: [],
  knowledgeItems: [],
  pipelineOrders: [],
  liveOrders: [],
  liveParentByChildId: {},
  pipelineParentByChildId: {},
  uploadedFiles: {},
  isHydrated: false,
  isParsingMeetings: false,
  isParsingPmScores: false,
  isParsingSales: false,

  setIsHydrated: (v) => set({ isHydrated: v }),
  setParsingMeetings: (v) => set({ isParsingMeetings: v }),
  setParsingPmScores: (v) => set({ isParsingPmScores: v }),
  setParsingSales: (v) => set({ isParsingSales: v }),
  setMeetings: (data) => {
    set({ meetings: data });
    idbSave('meetings', data).catch(console.error);
  },
  setPmScores: (data) => {
    set({ pmScores: data });
    idbSave('pmScores', data).catch(console.error);
  },
  setCustomerInsights: (data) => {
    set({ customerInsights: data });
    idbSave('customerInsights', data).catch(console.error);
  },
  setRiskSignals: (data) => {
    set({ riskSignals: data });
    idbSave('riskSignals', data).catch(console.error);
  },
  setKnowledgeItems: (data) => {
    set({ knowledgeItems: data });
    idbSave('knowledgeItems', data).catch(console.error);
  },
  setPipelineOrders: (data) => {
    set((state) => {
      const ids = new Set(data.map((o) => o.record_id));
      const pipelineParentByChildId = pruneParentMap(state.pipelineParentByChildId, ids);
      persistSoGrouping(state.liveParentByChildId, pipelineParentByChildId);
      return { pipelineOrders: data, pipelineParentByChildId };
    });
    idbSave('pipelineOrders', data).catch(console.error);
  },
  setLiveOrders: (data) => {
    set((state) => {
      const ids = new Set(data.map((o) => o.record_id));
      const liveParentByChildId = pruneParentMap(state.liveParentByChildId, ids);
      persistSoGrouping(liveParentByChildId, state.pipelineParentByChildId);
      return { liveOrders: data, liveParentByChildId };
    });
    idbSave('liveOrders', data).catch(console.error);
  },
  deletePipelineOrder: (recordId) =>
    set((state) => {
      const pipelineOrders = state.pipelineOrders.filter((o) => o.record_id !== recordId);
      const nextPipe = pruneParentMap(state.pipelineParentByChildId, new Set(pipelineOrders.map((o) => o.record_id)));
      persistSoGrouping(state.liveParentByChildId, nextPipe);
      idbSave('pipelineOrders', pipelineOrders).catch(console.error);
      return { pipelineOrders, pipelineParentByChildId: nextPipe };
    }),
  updatePipelineOrder: (recordId, patch) =>
    set((state) => {
      const pipelineOrders = state.pipelineOrders.map((o) =>
        o.record_id === recordId ? { ...o, ...patch } : o
      );
      idbSave('pipelineOrders', pipelineOrders).catch(console.error);
      return { pipelineOrders };
    }),
  setSoParent: (kind, childId, parentId) => {
    let out: LinkSoParentResult = { ok: true };
    set((state) => {
      const isLive = kind === 'live';
      const orders = isLive ? state.liveOrders : state.pipelineOrders;
      const validIds = new Set(orders.map((o) => o.record_id));
      const map = isLive ? state.liveParentByChildId : state.pipelineParentByChildId;

      if (parentId !== null) {
        const check = validateSoParentLink(map, childId, parentId, validIds);
        if (!check.ok) {
          out = check;
          return {};
        }
      }

      const next: SoChildToParentMap = { ...map };
      if (parentId === null) {
        delete next[childId];
      } else {
        next[childId] = parentId;
      }
      persistSoGrouping(isLive ? next : state.liveParentByChildId, isLive ? state.pipelineParentByChildId : next);
      return isLive
        ? { liveParentByChildId: next }
        : { pipelineParentByChildId: next };
    });
    return out;
  },
  markFileUploaded: (fileKey) =>
    set((state) => ({
      uploadedFiles: { ...state.uploadedFiles, [fileKey]: true },
    })),
  clearAllData: () => {
    idbClearAll().catch(console.error);
    set({
      meetings: [],
      pmScores: [],
      customerInsights: [],
      riskSignals: [],
      knowledgeItems: [],
      pipelineOrders: [],
      liveOrders: [],
      liveParentByChildId: {},
      pipelineParentByChildId: {},
      uploadedFiles: {},
    });
  },
}));

export type DataStoreState = ReturnType<typeof useDataStore.getState>;

export async function hydrateFromIndexedDB(store: DataStoreState): Promise<void> {
  const [
    meetings,
    pmScores,
    customerInsights,
    riskSignals,
    knowledgeItems,
    pipelineOrders,
    liveOrders,
    soGroupingRows,
  ] = await Promise.all([
    idbLoad<MeetingMaster>('meetings'),
    idbLoad<PMScore>('pmScores'),
    idbLoad<CustomerInsight>('customerInsights'),
    idbLoad<RiskSignal>('riskSignals'),
    idbLoad<KnowledgeItem>('knowledgeItems'),
    idbLoad<SalesOrderPipeline>('pipelineOrders'),
    idbLoad<SalesOrderLive>('liveOrders'),
    idbLoad<{ liveParentByChildId: SoChildToParentMap; pipelineParentByChildId: SoChildToParentMap }>(
      'soGrouping'
    ),
  ]);

  if (meetings.length) store.setMeetings(meetings);
  if (pmScores.length) store.setPmScores(pmScores);
  if (customerInsights.length) store.setCustomerInsights(customerInsights);
  if (riskSignals.length) store.setRiskSignals(riskSignals);
  if (knowledgeItems.length) store.setKnowledgeItems(knowledgeItems);

  const g0 = soGroupingRows[0];
  const liveIds = new Set(liveOrders.map((o) => o.record_id));
  const pipeIds = new Set(pipelineOrders.map((o) => o.record_id));
  const liveParentByChildId = pruneParentMap(g0?.liveParentByChildId ?? {}, liveIds);
  const pipelineParentByChildId = pruneParentMap(g0?.pipelineParentByChildId ?? {}, pipeIds);

  useDataStore.setState({
    pipelineOrders,
    liveOrders,
    liveParentByChildId,
    pipelineParentByChildId,
  });
  if (pipelineOrders.length) {
    idbSave('pipelineOrders', pipelineOrders).catch(console.error);
  }
  if (liveOrders.length) {
    idbSave('liveOrders', liveOrders).catch(console.error);
  }
  persistSoGrouping(liveParentByChildId, pipelineParentByChildId);

  const uploaded: Record<string, boolean> = {};
  if (meetings.length) uploaded['meetings_master'] = true;
  if (pmScores.length) uploaded['pm_scores'] = true;
  if (customerInsights.length) uploaded['customer_insights'] = true;
  if (riskSignals.length) uploaded['risk_signals'] = true;
  if (knowledgeItems.length) uploaded['knowledge_management'] = true;
  if (pipelineOrders.length) uploaded['sales_pipeline'] = true;
  if (liveOrders.length) uploaded['sales_live'] = true;
  Object.keys(uploaded).forEach((k) => store.markFileUploaded(k));

  store.setIsHydrated(true);
}
