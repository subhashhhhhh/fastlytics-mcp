import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { getR2Json, listR2Objects } from '../lib/r2.js';
import { getSupabase } from '../lib/supabase.js';
import { normalizeCacheSlug, normalizeSessionParam, normalizeEventSearch, SESSION_ORDER, SESSION_ORDER_MAP, isHistoricalYear } from '../lib/cache-keys.js';

function parseSessionFiles(files: string[], eventSlug: string) {
  const processedFiles = new Set(files.map((f) => f.split('/').pop() || ''));

  return SESSION_ORDER.filter((sessionId) => {
    if (processedFiles.has(`${eventSlug}_${sessionId}.json.gz`) || processedFiles.has(`${eventSlug}_${sessionId}.json`)) {
      if (sessionId === 'Q' && processedFiles.has(`${eventSlug}_Q1.json.gz`)) return false;
      if (sessionId === 'SQ' && processedFiles.has(`${eventSlug}_SQ1.json.gz`)) return false;
      return true;
    }
    return false;
  }).map((sessionId) => ({
    name: SESSION_ORDER_MAP[sessionId] || sessionId,
    type: sessionId,
  }));
}

export function registerSessionTools(server: McpServer) {
  server.registerTool(
    'list_events',
    {
      description:
        'List all events (races) for a given season year. Returns event names, round numbers, dates, country, and format. ' +
        'For years 2018+: reads from R2 cache. For 1950-2017: queries Supabase.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
      }),
    },
    async ({ year }) => {
      if (isHistoricalYear(year)) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('f1_rounds')
          .select('id, name, number, date, f1_seasons!inner(year), f1_circuits(name, location, country_code)')
          .eq('f1_seasons.year', year)
          .order('number');

        if (error || !data) {
          return { content: [{ type: 'text', text: `No events found for ${year}: ${error?.message}` }], isError: true };
        }

        const events = data.map((r: Record<string, unknown>) => ({
          RoundNumber: r.number,
          EventName: r.name,
          Country: (r.f1_circuits as Record<string, unknown>)?.country_code || '',
          Location: (r.f1_circuits as Record<string, unknown>)?.location || (r.f1_circuits as Record<string, unknown>)?.name || '',
          EventDate: r.date,
          EventFormat: 'conventional',
        }));

        return { content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] };
      }

      const schedule = await getR2Json<Array<Record<string, unknown>>>(`cache/${year}/schedule/season_schedule.json.gz`);
      if (!schedule) {
        return { content: [{ type: 'text', text: `No schedule found for ${year}` }], isError: true };
      }

      const events = schedule.map((row) => ({
        RoundNumber: row.RoundNumber,
        EventName: row.EventName,
        OfficialEventName: row.OfficialEventName,
        Country: row.Country,
        Location: row.Location,
        EventDate: row.EventDate,
        EventFormat: row.EventFormat,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] };
    },
  );

  server.registerTool(
    'list_sessions',
    {
      description:
        'List available sessions for a given event (e.g. Race, Qualifying, Practice 1, etc.). ' +
        'Returns session names and types. For 2018+: reads from R2. For 1950-2017: queries Supabase.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name (e.g. "Bahrain Grand Prix") or "round_N"'),
      }),
    },
    async ({ year, event }) => {
      if (isHistoricalYear(year)) {
        const supabase = getSupabase();
        const normalized = normalizeEventSearch(event);

        const { data: rounds } = await supabase
          .from('f1_rounds')
          .select('id, name, f1_seasons!inner(year)')
          .eq('f1_seasons.year', year)
          .order('number');

        if (!rounds) {
          return { content: [{ type: 'text', text: `No rounds found for ${year}` }], isError: true };
        }

        const round = (rounds as Array<Record<string, unknown>>).find((r) =>
          (r.name as string).toLowerCase().includes(normalized),
        );
        if (!round) {
          return { content: [{ type: 'text', text: `Event "${event}" not found in ${year}` }], isError: true };
        }

        const { data: sessions } = await supabase
          .from('f1_sessions')
          .select('type, number, has_time_data')
          .eq('round_id', round.id)
          .order('number');

        if (!sessions) {
          return { content: [{ type: 'text', text: JSON.stringify([{ name: 'Race', type: 'R' }], null, 2) }] };
        }

        const TYPE_MAP: Record<string, string> = {
          R: 'Race', Q: 'Qualifying', Q1: 'Qualifying 1', Q2: 'Qualifying 2', Q3: 'Qualifying 3',
          FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3',
          Sprint: 'Sprint Race', SQ: 'Sprint Qualifying',
        };

        const result = (sessions as Array<Record<string, unknown>>)
          .filter((s) => s.type === 'R' || (s.has_time_data && String(s.type).startsWith('Q')) || (s.has_time_data && String(s.type).startsWith('FP')))
          .map((s) => ({ name: TYPE_MAP[s.type as string] || s.type, type: s.type }));

        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      const eventSlug = normalizeCacheSlug(event);
      const prefix = `cache/${year}/races/${eventSlug}_`;
      const objects = await listR2Objects(prefix, 100);

      if (objects.length === 0) {
        const schedule = await getR2Json<Array<Record<string, unknown>>>(`cache/${year}/schedule/season_schedule.json.gz`);
        if (schedule) {
          const search = normalizeEventSearch(event);
          for (const row of schedule) {
            const name = normalizeEventSearch(String(row.EventName || ''));
            const official = normalizeEventSearch(String(row.OfficialEventName || ''));
            if (name.includes(search) || official.includes(search)) {
              const resolvedSlug = normalizeCacheSlug(String(row.EventName || ''));
              const resolvedPrefix = `cache/${year}/races/${resolvedSlug}_`;
              const resolvedObjects = await listR2Objects(resolvedPrefix, 100);
              if (resolvedObjects.length > 0) {
                const files = resolvedObjects.map((o) => o.key);
                const sessions = parseSessionFiles(files, resolvedSlug);
                return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
              }
            }
          }
        }
        return { content: [{ type: 'text', text: `No sessions found for ${event} in ${year}` }], isError: true };
      }

      const files = objects.map((o) => o.key);
      const sessions = parseSessionFiles(files, eventSlug);
      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
    },
  );

  server.registerTool(
    'list_drivers',
    {
      description:
        'List drivers who participated in a specific session. Returns driver codes, names, teams, and car numbers.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R", "Q")'),
      }),
    },
    async ({ year, event, session }) => {
      if (isHistoricalYear(year)) {
        const supabase = getSupabase();
        const normalized = normalizeEventSearch(event);

        const { data: rounds } = await supabase
          .from('f1_rounds')
          .select('id, name, f1_seasons!inner(year)')
          .eq('f1_seasons.year', year);

        const round = (rounds as Array<Record<string, unknown>>)?.find((r) =>
          (r.name as string).toLowerCase().includes(normalized),
        );
        if (!round) {
          return { content: [{ type: 'text', text: `Event not found: ${event}` }], isError: true };
        }

        const sessionType = normalizeSessionParam(session).toUpperCase();
        const { data: sessionData } = await supabase
          .from('f1_sessions')
          .select('id')
          .eq('round_id', round.id)
          .eq('type', sessionType)
          .limit(1);

        if (!sessionData?.length) {
          return { content: [{ type: 'text', text: `Session ${sessionType} not found` }], isError: true };
        }

        const { data: entries } = await supabase
          .from('f1_session_entries')
          .select('position, f1_round_entries!inner(car_number, f1_team_drivers!inner(f1_drivers(forename, surname, abbreviation, nationality), f1_teams(name, primary_color)))')
          .eq('session_id', sessionData[0].id)
          .order('position', { ascending: true, nullsFirst: false });

        if (!entries) {
          return { content: [{ type: 'text', text: 'No drivers found' }], isError: true };
        }

        const drivers = (entries as Array<Record<string, unknown>>).map((e) => {
          const re = e.f1_round_entries as Record<string, unknown>;
          const td = re.f1_team_drivers as Record<string, unknown>;
          const d = td.f1_drivers as Record<string, unknown>;
          const t = td.f1_teams as Record<string, unknown>;
          return {
            code: (d.abbreviation as string) || (d.surname as string)?.substring(0, 3).toUpperCase() || '???',
            name: `${d.forename} ${d.surname}`,
            team: t.name,
            teamColor: t.primary_color || '#ffffff',
            number: re.car_number,
          };
        });

        return { content: [{ type: 'text', text: JSON.stringify(drivers, null, 2) }] };
      }

      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();

      const chartKey = `cache/${year}/charts/${eventSlug}_${sessionUpper}_drivers.json.gz`;
      let drivers = await getR2Json<Array<Record<string, unknown>>>(chartKey);

      if (!drivers) {
        const sessKey = `cache/${year}/sessions/${eventSlug}_${sessionUpper}_drivers.json.gz`;
        drivers = await getR2Json<Array<Record<string, unknown>>>(sessKey);
      }

      if (!drivers) {
        return { content: [{ type: 'text', text: `No driver list found for ${event} ${sessionUpper} in ${year}` }], isError: true };
      }

      return { content: [{ type: 'text', text: JSON.stringify(drivers, null, 2) }] };
    },
  );
}
