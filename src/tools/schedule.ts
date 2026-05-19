import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { getR2Json } from '../lib/r2.js';
import { getSupabase } from '../lib/supabase.js';
import { isHistoricalYear } from '../lib/cache-keys.js';

export function registerScheduleTools(server: McpServer) {
  server.registerTool(
    'get_schedule',
    {
      description:
        'Get the full season schedule for a year. Returns all events with dates, countries, locations, and session times.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
      }),
    },
    async ({ year }) => {
      if (isHistoricalYear(year)) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('f1_rounds')
          .select('name, number, date, f1_circuits(name, location, country_code)')
          .eq('f1_seasons.year', year)
          .order('number');

        if (error || !data) {
          return { content: [{ type: 'text', text: `No schedule for ${year}` }], isError: true };
        }

        const schedule = (data as Array<Record<string, unknown>>).map((r) => ({
          RoundNumber: r.number,
          EventName: r.name,
          Country: (r.f1_circuits as Record<string, unknown>)?.country_code || '',
          Location: (r.f1_circuits as Record<string, unknown>)?.location || (r.f1_circuits as Record<string, unknown>)?.name || '',
          EventDate: r.date,
          EventFormat: 'conventional',
        }));

        return { content: [{ type: 'text', text: JSON.stringify(schedule, null, 2) }] };
      }

      const data = await getR2Json(`cache/${year}/schedule/season_schedule.json.gz`);
      if (!data) {
        return { content: [{ type: 'text', text: `No schedule found for ${year}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_standings',
    {
      description:
        'Get driver and constructor championship standings for a given year. ' +
        'Returns both driver and team standings from a single file.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
      }),
    },
    async ({ year }) => {
      if (isHistoricalYear(year)) {
        const supabase = getSupabase();

        const { data: season } = await supabase
          .from('f1_seasons')
          .select('id')
          .eq('year', year)
          .single();

        if (!season) {
          return { content: [{ type: 'text', text: `No season data for ${year}` }], isError: true };
        }

        const { data: entries } = await supabase
          .from('f1_round_entries')
          .select('f1_team_drivers!inner(driver_id, team_id, f1_drivers!inner(forename, surname, abbreviation), f1_teams!inner(name, primary_color))')
          .eq('f1_team_drivers.season_id', season.id);

        if (!entries) {
          return { content: [{ type: 'text', text: `No standings data for ${year}` }], isError: true };
        }

        const driverPoints: Record<string, { name: string; code: string; points: number }> = {};
        const teamPoints: Record<string, { name: string; points: number }> = {};

        for (const e of entries as Array<Record<string, unknown>>) {
          const td = e.f1_team_drivers as Record<string, unknown>;
          const d = td.f1_drivers as Record<string, unknown>;
          const t = td.f1_teams as Record<string, unknown>;
          const code = (d.abbreviation as string) || (d.surname as string)?.substring(0, 3).toUpperCase() || '???';
          const driverKey = `${d.forename} ${d.surname}`;
          driverPoints[driverKey] = { name: driverKey as string, code: code as string, points: 0 };
          teamPoints[t.name as string] = { name: t.name as string, points: 0 };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  drivers: Object.values(driverPoints),
                  teams: Object.values(teamPoints),
                  _note: 'Full standings with accumulated points require round-by-round results. Use get_race_results for per-race details.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const data = await getR2Json(`cache/${year}/standings/standings.json.gz`);
      if (!data) {
        return { content: [{ type: 'text', text: `No standings found for ${year}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
