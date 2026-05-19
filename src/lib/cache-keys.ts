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
