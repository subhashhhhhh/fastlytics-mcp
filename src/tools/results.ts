import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { getR2Json } from '../lib/r2.js';
import { getSupabase } from '../lib/supabase.js';
import { normalizeCacheSlug, normalizeSessionParam, normalizeEventSearch, isHistoricalYear } from '../lib/cache-keys.js';

export function registerResultTools(server: McpServer) {
  server.registerTool(
    'get_race_results',
    {
      description:
        'Get race results for a specific session. Returns positions, drivers, teams, gaps, points, status, fastest laps, and pit stops. ' +
        'For 2018+: reads from R2. For 1950-2017: queries Supabase.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name or slug'),
        session: z.string().default('R').describe('Session type (default: "R" for Race)'),
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
          .select('id, position, points, grid, laps_completed, time, status, fastest_lap_rank, f1_round_entries!inner(car_number, f1_team_drivers!inner(f1_drivers(forename, surname, abbreviation, nationality, reference, image_url), f1_teams(name, reference, primary_color)))')
          .eq('session_id', sessionData[0].id)
          .order('position', { ascending: true, nullsFirst: false });

        if (!entries) {
          return { content: [{ type: 'text', text: 'No results found' }], isError: true };
        }

        const STATUS_MAP: Record<number, string> = {
          0: 'Finished', 1: '+1 Lap', 2: '+2 Laps', 3: '+3 Laps', 4: '+4 Laps', 5: '+5 Laps',
          10: 'Accident', 11: 'Mechanical', 12: 'Retired', 13: 'Disqualified',
        };

        const results = (entries as Array<Record<string, unknown>>).map((entry) => {
          const re = entry.f1_round_entries as Record<string, unknown>;
          const td = re.f1_team_drivers as Record<string, unknown>;
          const d = td.f1_drivers as Record<string, unknown>;
          const t = td.f1_teams as Record<string, unknown>;
          const statusNum = (entry.status as number) ?? 0;

          return {
            position: entry.position,
            driverCode: (d.abbreviation as string) || (d.surname as string)?.substring(0, 3).toUpperCase() || '???',
            fullName: `${d.forename} ${d.surname}`,
            team: t.name,
            teamColor: t.primary_color ? ((t.primary_color as string).startsWith('#') ? t.primary_color : `#${t.primary_color}`) : '#ffffff',
            gridPosition: entry.grid,
            lapsCompleted: entry.laps_completed,
            time: entry.position === 1 ? entry.time : null,
            points: parseFloat((entry.points as string) || '0'),
            status: statusNum === 0 ? 'Finished' : (STATUS_MAP[statusNum] || 'DNF'),
            fastestLapRank: entry.fastest_lap_rank,
            isFastestLap: entry.fastest_lap_rank === 1,
            carNumber: re.car_number,
            headshotUrl: d.image_url || null,
            positionsGained: entry.grid && entry.position ? (entry.grid as number) - (entry.position as number) : null,
          };
        });

        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const key = `cache/${year}/races/${eventSlug}_${sessionUpper}.json.gz`;

      const data = await getR2Json(key);
      if (!data) {
        const yearKey = `cache/${year}/race_results.json.gz`;
        const yearData = await getR2Json<Array<Record<string, unknown>>>(yearKey);
        if (yearData) {
          const search = normalizeEventSearch(event);
          const matching = yearData.filter((r) => {
            const en = normalizeEventSearch(String(r.event_name || r.EventName || ''));
            const off = normalizeEventSearch(String(r.official_event_name || r.OfficialEventName || ''));
            return en.includes(search) || off.includes(search);
          });
          if (matching.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(matching, null, 2) }] };
          }
        }
        return {
          content: [{ type: 'text', text: `No results found for ${event} ${sessionUpper} in ${year}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
