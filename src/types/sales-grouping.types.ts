/** child record_id → parent record_id (yalnızca alt SO’lar; kök satırlar map’te yok). */
export type SoChildToParentMap = Record<string, string>;

export interface SalesOrderGroupingState {
  liveParentByChildId: SoChildToParentMap;
  pipelineParentByChildId: SoChildToParentMap;
}
