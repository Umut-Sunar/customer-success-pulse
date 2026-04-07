import { PainPoint, UpsellOpportunity, FeatureRequest, PMScore, PMScoreAggregated } from '../types/meeting.types';

export function safeParseJSON<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString || jsonString.trim() === '' || jsonString === 'null') return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

export function parsePainPoints(jsonString: string): PainPoint[] {
  return safeParseJSON<PainPoint[]>(jsonString, []);
}

export function parseUpsellOpportunities(jsonString: string): UpsellOpportunity[] {
  return safeParseJSON<UpsellOpportunity[]>(jsonString, []);
}

export function parseFeatureRequests(jsonString: string): FeatureRequest[] {
  return safeParseJSON<FeatureRequest[]>(jsonString, []);
}

export function parseStringArray(jsonString: string): string[] {
  return safeParseJSON<string[]>(jsonString, []);
}

export function normalizeBool(val: string | boolean | undefined): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

export function normalizeNumber(val: string | number | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function aggregatePMScores(pmScores: PMScore[]): PMScoreAggregated[] {
  const grouped = new Map<string, PMScore[]>();

  for (const score of pmScores) {
    const key = score.pm_email || score.pm_name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(score);
  }

  return Array.from(grouped.entries()).map(([, scores]) => {
    const count = scores.length;
    const avg = (field: keyof PMScore) =>
      scores.reduce((sum, s) => sum + normalizeNumber(s[field] as string), 0) / count;

    const englishLevels: Record<string, number> = {};
    scores.forEach((s) => {
      const lvl = s.english_level || 'N/A';
      englishLevels[lvl] = (englishLevels[lvl] || 0) + 1;
    });

    return {
      pm_name: scores[0].pm_name,
      pm_email: scores[0].pm_email,
      meeting_count: count,
      avg_preparation: avg('preparation'),
      avg_customer_mgmt: avg('customer_mgmt'),
      avg_tech_mastery: avg('tech_mastery'),
      avg_action_quality: avg('action_quality'),
      avg_communication: avg('communication'),
      avg_overall: avg('overall'),
      english_levels: englishLevels,
      customer_meeting_count: scores.filter((s) => normalizeBool(s.is_customer_meeting)).length,
      internal_meeting_count: scores.filter((s) => !normalizeBool(s.is_customer_meeting)).length,
      total_duration_min: 0, // Will be joined with meetings data
    };
  });
}
