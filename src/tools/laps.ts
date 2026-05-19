import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { getR2Json } from '../lib/r2.js';
import { getSupabase } from '../lib/supabase.js';
import { normalizeCacheSlug, normalizeSessionParam, normalizeEventSearch, isHistoricalYear } from '../lib/cache-keys.js';

export function registerLapTools(server: McpServer) {
  server.registerTool(
    'get_laptimes',
    {
      description:
        'Get lap time comparison data for one or more drivers in a session. ' +
        'Returns lapComparison (lap-by-lap times) and driverLapDetails (detailed per-driver lap info). ' +
        'For 2018+: reads from R2. For 1950-2017: queries Supabase f1_laps.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R", "Q")'),
        drivers: z.array(z.string().min(3).max(3)).describe('Array of 3-letter driver codes (e.g. ["VER", "HAM"])'),
      }),
    },
    async ({ year, event, session, drivers }) => {
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

        const { data: allEntries } = await supabase
          .from('f1_session_entries')
          .select('id, f1_round_entries!inner(f1_team_drivers!inner(f1_drivers!inner(abbreviation, surname)))')
          .eq('session_id', sessionData[0].id);

        if (!allEntries?.length) {
          return { content: [{ type: 'text', text: 'No entries found' }], isError: true };
        }

        const driverUpper = drivers.map((d) => d.toUpperCase());
        const entryIds: number[] = [];
        const entryToDriver = new Map<number, string>();

        for (const entry of allEntries as Array<Record<string, unknown>>) {
          const re = entry.f1_round_entries as Record<string, unknown>;
          const td = re.f1_team_drivers as Record<string, unknown>;
          const d = td.f1_drivers as Record<string, unknown>;
          const code = ((d.abbreviation as string) || (d.surname as string)?.substring(0, 3).toUpperCase() || '').toUpperCase();
          if (driverUpper.includes(code)) {
            entryIds.push(entry.id as number);
            entryToDriver.set(entry.id as number, code);
          }
        }

        if (entryIds.length === 0) {
          return { content: [{ type: 'text', text: `None of the requested drivers found in this session` }], isError: true };
        }

        const { data: laps } = await supabase
          .from('f1_laps')
          .select('number, time, position, session_entry_id')
          .in('session_entry_id', entryIds)
          .order('number', { ascending: true })
          .limit(5000);

        if (!laps) {
          return { content: [{ type: 'text', text: 'No lap data found' }], isError: true };
        }

        const lapComparisonMap = new Map<number, Record<string, unknown>>();
        const driverLapDetails: Record<string, Array<Record<string, unknown>>> = {};
        for (const code of driverUpper) driverLapDetails[code] = [];

        for (const lap of laps as Array<Record<string, unknown>>) {
          const code = entryToDriver.get(lap.session_entry_id as number);
          if (!code) continue;

          const lapTime = parseTimeToSeconds(lap.time as string | null);

          if (!lapComparisonMap.has(lap.number as number)) {
            lapComparisonMap.set(lap.number as number, { LapNumber: lap.number });
          }
          const point = lapComparisonMap.get(lap.number as number)!;
          point[code] = lapTime;

          driverLapDetails[code].push({
            lapNumber: lap.number,
            lapTime,
            sector1: null,
            sector2: null,
            sector3: null,
            compound: null,
            tyreLife: null,
            position: lap.position,
          });
        }

        const lapComparison = [...lapComparisonMap.values()].sort(
          (a, b) => (a.LapNumber as number) - (b.LapNumber as number),
        );

        return {
          content: [{ type: 'text', text: JSON.stringify({ lapComparison, driverLapDetails, weather: null }, null, 2) }],
        };
      }

      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const sortedDrivers = [...drivers].sort().join('_').toUpperCase();
      const key = `cache/${year}/charts/${eventSlug}_${sessionUpper}_${sortedDrivers}_laptimes_enriched.json.gz`;

      const data = await getR2Json(key);
      if (!data) {
        return {
          content: [{ type: 'text', text: `No lap time data found for ${sortedDrivers} at ${event} ${sessionUpper} in ${year}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_lap_positions',
    {
      description:
        'Get position progression data for a session. Returns lap-by-lap positions for all drivers.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type'),
      }),
    },
    async ({ year, event, session }) => {
      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const key = `cache/${year}/charts/${eventSlug}_${sessionUpper}_positions.json.gz`;

      const data = await getR2Json(key);
      if (!data) {
        return {
          content: [{ type: 'text', text: `No position data found for ${event} ${sessionUpper} in ${year}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}

function parseTimeToSeconds(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(time) || null;
}
