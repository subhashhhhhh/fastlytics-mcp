export const SESSION_NAME_TO_ID: Record<string, string> = {
  race: 'R',
  qualifying: 'Q',
  'sprint race': 'Sprint',
  sprint: 'Sprint',
  'sprint qualifying': 'SQ',
  'sprint quali': 'SQ',
  'practice 1': 'FP1',
  'practice 2': 'FP2',
  'practice 3': 'FP3',
};

export const SESSION_ORDER_MAP: Record<string, string> = {
  FP1: 'Practice 1',
  FP2: 'Practice 2',
  FP3: 'Practice 3',
  SQ1: 'Sprint Quali 1',
  SQ2: 'Sprint Quali 2',
  SQ3: 'Sprint Quali 3',
  Q1: 'Qualifying 1',
  Q2: 'Qualifying 2',
  Q3: 'Qualifying 3',
  Sprint: 'Sprint Race',
  R: 'Race',
  SQ: 'Sprint Quali',
  Q: 'Qualifying',
};

export const SESSION_ORDER = Object.keys(SESSION_ORDER_MAP);

export function normalizeSessionParam(session: string): string {
  const lower = session.toLowerCase().trim();
  return SESSION_NAME_TO_ID[lower] || session;
}

export function normalizeCacheSlug(value: string): string {
  let normalized = value;
  try {
    normalized = decodeURIComponent(value);
  } catch {
    // ignore
  }
  return normalized.toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeEventSearch(value: string): string {
  let normalized = value;
  try {
    normalized = decodeURIComponent(value);
  } catch {
    // ignore
  }
  return normalized.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isHistoricalYear(year: number): boolean {
  return year < 2018;
}
